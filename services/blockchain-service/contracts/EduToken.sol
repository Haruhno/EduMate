// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract EduToken {
    string public constant name = "EduToken";
    string public constant symbol = "EDU";
    uint8 public constant decimals = 18;
    uint256 public constant INITIAL_BALANCE = 500 * 10**decimals; // 500 EDU
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