// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// ============================
// EduToken Contract
// ============================
contract EduToken {
    string public constant name = "EduToken";
    string public constant symbol = "EDU";
    uint8 public constant decimals = 18;
    uint256 public constant INITIAL_BALANCE = 600 * 10**decimals; // 500 EDU
    uint256 public constant TOTAL_SUPPLY = 1000000 * 10**decimals;
    
    address public owner;
    uint256 public totalSupply;
    uint256 public distributedSupply;
    
    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;
    mapping(address => bool) private _hasReceivedInitialBalance;
    
    // Mapping pour les wallets déterministes (userId -> address)
    mapping(bytes32 => address) public userIdToAddress;
    mapping(address => bytes32) public addressToUserId;
    
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event WalletRegistered(bytes32 indexed userId, address walletAddress);
    event InitialBalanceGranted(address indexed user, uint256 amount);
    event TokensMinted(address indexed to, uint256 amount);
    event EduTransfer(address indexed from, address indexed to, uint256 value, string description, uint256 timestamp);
    
    constructor() {
        owner = msg.sender;
        totalSupply = TOTAL_SUPPLY;
        _balances[owner] = TOTAL_SUPPLY;
        distributedSupply = 0;
        emit Transfer(address(0), owner, TOTAL_SUPPLY);
    }
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    // Fonction INTERNE pour mint des tokens initiaux
    function mintInitialTokens(address walletAddress, uint256 amount) internal {
        require(_balances[owner] >= amount, "Insufficient owner balance");
        require(!_hasReceivedInitialBalance[walletAddress], "Already received initial balance");
        
        _balances[owner] -= amount;
        _balances[walletAddress] += amount;
        _hasReceivedInitialBalance[walletAddress] = true;
        distributedSupply += amount;
        
        emit Transfer(owner, walletAddress, amount);
        emit InitialBalanceGranted(walletAddress, amount);
        emit TokensMinted(walletAddress, amount);
    }
    
    // Fonction pour enregistrer un wallet déterministe
    function registerWallet(bytes32 userId, address walletAddress) external onlyOwner {
        require(userIdToAddress[userId] == address(0), "User already registered");
        require(walletAddress != address(0), "Invalid address");
        require(addressToUserId[walletAddress] == bytes32(0), "Address already registered");
        
        userIdToAddress[userId] = walletAddress;
        addressToUserId[walletAddress] = userId;
        
        emit WalletRegistered(userId, walletAddress);
        
        // Distribuer automatiquement les 500 EDU si pas déjà fait
        if (!_hasReceivedInitialBalance[walletAddress]) {
            mintInitialTokens(walletAddress, INITIAL_BALANCE);
        }
    }
    
    // Fonction publique pour mint des tokens initiaux (pour l'initialisation via script)
    function mintTokensForUser(address walletAddress, uint256 amount) external onlyOwner {
        mintInitialTokens(walletAddress, amount);
    }
    
    // Vérifier si un wallet est enregistré pour un userId
    function getWalletAddress(bytes32 userId) external view returns (address) {
        return userIdToAddress[userId];
    }
    
    // Vérifier si un utilisateur a reçu son solde initial
    function hasInitialBalance(address user) external view returns (bool) {
        return _hasReceivedInitialBalance[user];
    }
    
    // Obtenir le userId pour une adresse
    function getUserId(address walletAddress) external view returns (bytes32) {
        return addressToUserId[walletAddress];
    }
    
    // Standard ERC20 functions
    function balanceOf(address account) external view returns (uint256) {
        return _balances[account];
    }
    
    function allowance(address owner_, address spender) external view returns (uint256) {
        return _allowances[owner_][spender];
    }
    
    function transfer(address to, uint256 value) external returns (bool) {
        require(to != address(0), "Transfer to zero address");
        require(_balances[msg.sender] >= value, "Insufficient balance");
        
        _balances[msg.sender] -= value;
        _balances[to] += value;
        
        emit Transfer(msg.sender, to, value);
        return true;
    }
    
    function approve(address spender, uint256 value) external returns (bool) {
        _allowances[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }
    
    function transferFrom(address from, address to, uint256 value) external returns (bool) {
        require(from != address(0), "Transfer from zero address");
        require(to != address(0), "Transfer to zero address");
        require(_balances[from] >= value, "Insufficient balance");
        require(_allowances[from][msg.sender] >= value, "Allowance exceeded");
        
        _balances[from] -= value;
        _balances[to] += value;
        _allowances[from][msg.sender] -= value;
        
        emit Transfer(from, to, value);
        return true;
    }
    
    // Fonction principale avec description
    function transferWithDescription(
        address to, 
        uint256 amount, 
        string memory description
    ) public returns (bool) {
        require(to != address(0), "Transfer to zero address");
        require(_balances[msg.sender] >= amount, "Insufficient balance");
        
        _balances[msg.sender] -= amount;
        _balances[to] += amount;
        
        emit Transfer(msg.sender, to, amount);
        emit EduTransfer(msg.sender, to, amount, description, block.timestamp);
        
        return true;
    }
    
    // Fonction pour vérifier le total distribué
    function getDistributedSupply() external view returns (uint256) {
        return distributedSupply;
    }
    
    // Fonction pour vérifier le nombre d'utilisateurs enregistrés
    function getRegisteredUsersCount() external view returns (uint256) {
        // Note: impossible de compter directement les mappings en Solidity
        // Dans une vraie implémentation, vous auriez besoin d'un tableau
        return 0; // Placeholder
    }
}

// ============================
// BookingEscrow Contract
// ============================
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
        bool studentCourseHeld;  // Pour tracker la confirmation de l'étudiant
        bool tutorCourseHeld;    // Pour tracker la confirmation du tuteur
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
            frontendId: frontendId,
            studentCourseHeld: false,
            tutorCourseHeld: false
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
        
        // Enregistrer la confirmation de cette partie
        if (msg.sender == booking.student) {
            booking.studentConfirmed = true;
            booking.studentCourseHeld = courseHeld;
        } else {
            booking.tutorConfirmed = true;
            booking.tutorCourseHeld = courseHeld;
        }
        
        emit OutcomeConfirmed(bookingId, msg.sender, courseHeld);
        
        // Vérifier si les deux parties ont confirmé
        if (booking.studentConfirmed && booking.tutorConfirmed) {
            // Les deux parties ont confirmé - vérifier si elles sont d'accord
            if (booking.studentCourseHeld == booking.tutorCourseHeld) {
                // Elles sont d'accord!
                if (booking.studentCourseHeld) {
                    // Les deux confirment que le cours a eu lieu -> transfert au tuteur
                    booking.status = BookingStatus.COMPLETED;
                    booking.outcome = Outcome.COURSE_HELD;
                    
                    // Transfer funds to tutor
                    require(token.transfer(booking.tutor, booking.amount), "Transfer to tutor failed");
                    
                    emit BookingCompleted(bookingId);
                    emit FundsTransferred(bookingId, booking.tutor, booking.amount);
                } else {
                    // Les deux confirment que le cours n'a pas eu lieu -> refund à l'étudiant
                    booking.status = BookingStatus.CANCELLED;
                    booking.outcome = Outcome.COURSE_NOT_HELD;
                    
                    // Refund student
                    require(token.transfer(booking.student, booking.amount), "Refund to student failed");
                    
                    emit BookingCancelled(bookingId, msg.sender, "Course not held by mutual agreement");
                    emit FundsRefunded(bookingId, booking.student, booking.amount);
                }
            }
            // Si elles ne sont pas d'accord, il faudrait une dispute resolution
            // Pour l'instant on ne fait rien
        }
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