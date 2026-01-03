// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title AgriLoanContract
 * @author AgroSure Team
 * @notice Simple agriculture loan system for Shardeum
 */
contract AgriLoanContract {
    
    address public admin;
    uint256 public loanCounter;
    
    enum LoanStatus { REQUESTED, APPROVED, REJECTED, REPAID, DEFAULTED }
    
    struct LoanInput {
        uint256 amount;
        uint256 tenure;
        uint256 landSize;
        uint256 interest;
        string purpose;
    }
    
    struct Loan {
        address farmer;
        uint256 amount;
        uint256 tenure;
        uint256 interest;
        uint256 totalRepayment;
        uint256 amountRepaid;
        uint256 authenticityScore;
        uint256 requestTime;
        LoanStatus status;
    }
    
    mapping(uint256 => Loan) public loans;
    mapping(uint256 => string) public loanPurposes;
    mapping(address => uint256[]) public farmerLoans;
    mapping(address => bool) public registeredFarmers;
    
    event LoanRequested(uint256 indexed loanId, address indexed farmer, uint256 amount, uint256 score);
    event LoanApproved(uint256 indexed loanId, address indexed farmer, uint256 totalRepayment);
    event LoanRejected(uint256 indexed loanId, address indexed farmer);
    event LoanRepaid(uint256 indexed loanId, address indexed farmer);
    event FarmerRegistered(address indexed farmer);
    
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin");
        _;
    }
    
    modifier loanExists(uint256 _id) {
        require(_id > 0 && _id <= loanCounter, "Loan not found");
        _;
    }
    
    constructor() {
        admin = msg.sender;
    }
    
    function transferAdmin(address _newAdmin) external onlyAdmin {
        require(_newAdmin != address(0), "Invalid");
        admin = _newAdmin;
    }
    
    function registerFarmer(address _farmer) external {
        require(!registeredFarmers[_farmer], "Registered");
        registeredFarmers[_farmer] = true;
        emit FarmerRegistered(_farmer);
    }
    
    function approveLoan(uint256 _id) external onlyAdmin loanExists(_id) {
        Loan storage loan = loans[_id];
        require(loan.status == LoanStatus.REQUESTED, "Not REQUESTED");
        loan.status = LoanStatus.APPROVED;
        loan.totalRepayment = loan.amount + (loan.amount * loan.interest * loan.tenure) / 1200;
        emit LoanApproved(_id, loan.farmer, loan.totalRepayment);
    }
    
    function rejectLoan(uint256 _id) external onlyAdmin loanExists(_id) {
        require(loans[_id].status == LoanStatus.REQUESTED, "Not REQUESTED");
        loans[_id].status = LoanStatus.REJECTED;
        emit LoanRejected(_id, loans[_id].farmer);
    }
    
    function requestLoan(LoanInput calldata input) public returns (uint256) {
        require(input.amount > 0, "Amount > 0");
        require(input.tenure > 0 && input.tenure <= 120, "Tenure 1-120");
        require(bytes(input.purpose).length > 0, "Purpose required");
        
        if (!registeredFarmers[msg.sender]) {
            registeredFarmers[msg.sender] = true;
            emit FarmerRegistered(msg.sender);
        }
        
        loanCounter++;
        uint256 newId = loanCounter;
        
        Loan storage loan = loans[newId];
        loan.farmer = msg.sender;
        loan.amount = input.amount;
        loan.tenure = input.tenure;
        loan.interest = input.interest;
        loan.authenticityScore = _calcScore(input.amount, input.tenure, input.landSize);
        loan.requestTime = block.timestamp;
        loan.status = LoanStatus.REQUESTED;
        
        loanPurposes[newId] = input.purpose;
        farmerLoans[msg.sender].push(newId);
        
        emit LoanRequested(newId, msg.sender, input.amount, loan.authenticityScore);
        
        return newId;
    }
    
    function repayLoan(uint256 _id) external payable loanExists(_id) {
        Loan storage loan = loans[_id];
        require(loan.farmer == msg.sender, "Not yours");
        require(loan.status == LoanStatus.APPROVED, "Not approved");
        require(msg.value > 0, "Send ETH");
        
        uint256 remaining = loan.totalRepayment - loan.amountRepaid;
        uint256 payment = msg.value > remaining ? remaining : msg.value;
        loan.amountRepaid += payment;
        
        if (msg.value > remaining) {
            (bool refundSuccess, ) = payable(msg.sender).call{value: msg.value - remaining}("");
            require(refundSuccess, "Refund failed");
        }
        (bool success, ) = payable(admin).call{value: payment}("");
        require(success, "Payment failed");
        
        if (loan.amountRepaid >= loan.totalRepayment) {
            loan.status = LoanStatus.REPAID;
            emit LoanRepaid(_id, msg.sender);
        }
    }
    
    function getLoanDetails(uint256 _id) external view loanExists(_id) returns (
        address farmer, uint256 amount, uint256 tenure, uint256 interest,
        uint256 totalRepayment, uint256 amountRepaid, uint256 score, LoanStatus status
    ) {
        Loan storage l = loans[_id];
        return (l.farmer, l.amount, l.tenure, l.interest, l.totalRepayment, l.amountRepaid, l.authenticityScore, l.status);
    }
    
    function getLoanPurpose(uint256 _id) external view returns (string memory) {
        return loanPurposes[_id];
    }
    
    function getFarmerLoanIds(address _farmer) external view returns (uint256[] memory) {
        return farmerLoans[_farmer];
    }
    
    function getTotalLoans() external view returns (uint256) {
        return loanCounter;
    }
    
    function getLoanStatus(uint256 _id) external view loanExists(_id) returns (string memory) {
        LoanStatus s = loans[_id].status;
        if (s == LoanStatus.REQUESTED) return "REQUESTED";
        if (s == LoanStatus.APPROVED) return "APPROVED";
        if (s == LoanStatus.REJECTED) return "REJECTED";
        if (s == LoanStatus.REPAID) return "REPAID";
        return "DEFAULTED";
    }
    
    function _calcScore(uint256 _amt, uint256 _tenure, uint256 _land) internal pure returns (uint256) {
        uint256 s = 50;
        if (_amt <= 50000) s += 25;
        else if (_amt <= 100000) s += 20;
        else if (_amt <= 300000) s += 15;
        else s += 10;
        
        if (_tenure >= 12 && _tenure <= 24) s += 15;
        else if (_tenure >= 6 && _tenure <= 36) s += 10;
        else s += 5;
        
        if (_land >= 5) s += 10;
        else if (_land >= 2) s += 7;
        else s += 3;
        
        return s > 100 ? 100 : s;
    }
    
    function emergencyWithdraw() external onlyAdmin {
        (bool success, ) = payable(admin).call{value: address(this).balance}("");
        require(success, "Withdraw failed");
    }
    
    receive() external payable {}
    fallback() external payable {}
}
