// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./EduToken.sol";

contract BookingEscrow {
    EduToken public token;
    
    enum BookingStatus { PENDING, CONFIRMED, CANCELLED, COMPLETED, DISPUTED }
    enum Outcome { NOT_DECIDED, COURSE_HELD, COURSE_NOT_HELD }
    
    struct Booking {
        uint256 id;
        address student;
        address tutor;
        uint256 amount;
        uint256 startTime;
        uint256 duration;
        BookingStatus status;
        Outcome outcome;
        uint256 createdAt;
        bool studentConfirmed;
        bool tutorConfirmed;
        string description;
        bytes32 frontendId;
    }
    
    uint256 private _bookingCounter;
    mapping(uint256 => Booking) public bookings;
    mapping(bytes32 => uint256) public frontendToBookingId;
    
    event BookingCreated(
        uint256 indexed bookingId,
        bytes32 indexed frontendId,
        address indexed student,
        address tutor,
        uint256 amount,
        uint256 startTime,
        string description
    );
    
    event BookingConfirmed(uint256 indexed bookingId, address confirmedBy);
    event BookingCancelled(uint256 indexed bookingId, address cancelledBy, string reason);
    event BookingCompleted(uint256 indexed bookingId);
    event OutcomeConfirmed(uint256 indexed bookingId, address confirmedBy, bool courseHeld);
    event FundsTransferred(uint256 indexed bookingId, address to, uint256 amount);
    event FundsRefunded(uint256 indexed bookingId, address to, uint256 amount);
    
    constructor(address tokenAddress) {
        token = EduToken(tokenAddress);
    }
    
    modifier onlyParties(uint256 bookingId) {
        require(
            msg.sender == bookings[bookingId].student || 
            msg.sender == bookings[bookingId].tutor,
            "Not a party"
        );
        _;
    }
    
    modifier onlyTutor(uint256 bookingId) {
        require(msg.sender == bookings[bookingId].tutor, "Not tutor");
        _;
    }
    
    function createBooking(
        address tutor,
        uint256 amount,
        uint256 startTime,
        uint256 duration,
        string calldata description,
        bytes32 frontendId
    ) external returns (uint256) {
        require(tutor != address(0), "Invalid tutor");
        require(tutor != msg.sender, "Cannot book yourself");
        require(amount > 0, "Amount must be > 0");
        require(startTime > block.timestamp, "Start time must be future");
        require(frontendToBookingId[frontendId] == 0, "Duplicate frontend ID");
        
        // Check student balance and allowance
        require(token.balanceOf(msg.sender) >= amount, "Insufficient balance");
        require(token.allowance(msg.sender, address(this)) >= amount, "Allowance insufficient");
        
        // Transfer tokens to escrow
        require(token.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        
        uint256 bookingId = _bookingCounter++;
        
        bookings[bookingId] = Booking({
            id: bookingId,
            student: msg.sender,
            tutor: tutor,
            amount: amount,
            startTime: startTime,
            duration: duration,
            status: BookingStatus.PENDING,
            outcome: Outcome.NOT_DECIDED,
            createdAt: block.timestamp,
            studentConfirmed: false,
            tutorConfirmed: false,
            description: description,
            frontendId: frontendId
        });
        
        frontendToBookingId[frontendId] = bookingId;
        
        emit BookingCreated(bookingId, frontendId, msg.sender, tutor, amount, startTime, description);
        
        return bookingId;
    }
    
    function confirmBooking(uint256 bookingId) external onlyTutor(bookingId) {
        Booking storage booking = bookings[bookingId];
        require(booking.status == BookingStatus.PENDING, "Not pending");
        
        booking.status = BookingStatus.CONFIRMED;
        emit BookingConfirmed(bookingId, msg.sender);
    }
    
    function rejectBooking(uint256 bookingId) external onlyTutor(bookingId) {
        Booking storage booking = bookings[bookingId];
        require(booking.status == BookingStatus.PENDING, "Not pending");
        
        // Refund student immediately
        require(token.transfer(booking.student, booking.amount), "Refund failed");
        
        booking.status = BookingStatus.CANCELLED;
        emit BookingCancelled(bookingId, msg.sender, "Tutor rejected");
        emit FundsRefunded(bookingId, booking.student, booking.amount);
    }
    
    function confirmCourseOutcome(uint256 bookingId, bool courseHeld) external onlyParties(bookingId) {
        Booking storage booking = bookings[bookingId];
        require(booking.status == BookingStatus.CONFIRMED, "Not confirmed");
        require(block.timestamp >= booking.startTime, "Course not started yet");
        
        if (msg.sender == booking.student) {
            booking.studentConfirmed = true;
        } else {
            booking.tutorConfirmed = true;
        }
        
        // Check if both parties confirmed
        if (booking.studentConfirmed && booking.tutorConfirmed) {
            if (courseHeld) {
                // Both confirm course was held
                booking.status = BookingStatus.COMPLETED;
                booking.outcome = Outcome.COURSE_HELD;
                
                // Transfer funds to tutor
                require(token.transfer(booking.tutor, booking.amount), "Transfer failed");
                
                emit BookingCompleted(bookingId);
                emit FundsTransferred(bookingId, booking.tutor, booking.amount);
            } else {
                // Both confirm course was NOT held
                booking.status = BookingStatus.CANCELLED;
                booking.outcome = Outcome.COURSE_NOT_HELD;
                
                // Refund student
                require(token.transfer(booking.student, booking.amount), "Refund failed");
                
                emit BookingCancelled(bookingId, msg.sender, "Course not held");
                emit FundsRefunded(bookingId, booking.student, booking.amount);
            }
        }
        
        emit OutcomeConfirmed(bookingId, msg.sender, courseHeld);
    }
    
    // Dispute handling after 7 days if no consensus
    function triggerDispute(uint256 bookingId) external onlyParties(bookingId) {
        Booking storage booking = bookings[bookingId];
        require(booking.status == BookingStatus.CONFIRMED, "Not confirmed");
        require(block.timestamp >= booking.startTime + booking.duration + 7 days, "Too early for dispute");
        
        booking.status = BookingStatus.DISPUTED;
        // In a real implementation, you'd have a dispute resolution mechanism
    }
    
    // View functions
    function getBooking(uint256 bookingId) external view returns (
        uint256 id,
        address student,
        address tutor,
        uint256 amount,
        uint256 startTime,
        uint256 duration,
        uint8 status,
        uint8 outcome,
        uint256 createdAt,
        bool studentConfirmed,
        bool tutorConfirmed,
        string memory description,
        bytes32 frontendId
    ) {
        Booking memory b = bookings[bookingId];
        return (
            b.id,
            b.student,
            b.tutor,
            b.amount,
            b.startTime,
            b.duration,
            uint8(b.status),
            uint8(b.outcome),
            b.createdAt,
            b.studentConfirmed,
            b.tutorConfirmed,
            b.description,
            b.frontendId
        );
    }
    
    function getBookingByFrontendId(bytes32 frontendId) external view returns (uint256) {
        return frontendToBookingId[frontendId];
    }
    
    function getBookingCount() external view returns (uint256) {
        return _bookingCounter;
    }
}