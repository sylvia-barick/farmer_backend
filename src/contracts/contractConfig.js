/**
 * Contract ABI and Configuration for AgriLoanContract
 * Network: Shardeum EVM Testnet
 * Deploy using Remix IDE and update CONTRACT_ADDRESS after deployment
 */

// Shardeum Testnet Configuration
const SHARDEUM_TESTNET = {
    chainId: '0x1F92', // 8082 in hex
    chainName: 'Shardeum Sphinx',
    nativeCurrency: {
        name: 'Shardeum',
        symbol: 'SHM',
        decimals: 18
    },
    rpcUrls: ['https://sphinx.shardeum.org/'],
    blockExplorerUrls: ['https://explorer-sphinx.shardeum.org/']
};

// Contract Address - Will be deployed from this address
// UPDATE THIS AFTER DEPLOYING VIA REMIX
const CONTRACT_ADDRESS = '0x38a8d0328ad586CEE1f973CAfB5a01678d634578';

// Admin Wallet Address (same as deployer)
const ADMIN_ADDRESS = '0x38a8d0328ad586CEE1f973CAfB5a01678d634578';

// Contract ABI (simplified for frontend)
const CONTRACT_ABI = [
    // Events
    {
        "anonymous": false,
        "inputs": [
            { "indexed": true, "name": "loanId", "type": "uint256" },
            { "indexed": true, "name": "farmer", "type": "address" },
            { "indexed": false, "name": "amount", "type": "uint256" },
            { "indexed": false, "name": "tenure", "type": "uint256" },
            { "indexed": false, "name": "interestRate", "type": "uint256" },
            { "indexed": false, "name": "purpose", "type": "string" },
            { "indexed": false, "name": "authenticityScore", "type": "uint256" },
            { "indexed": false, "name": "timestamp", "type": "uint256" }
        ],
        "name": "LoanRequested",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            { "indexed": true, "name": "loanId", "type": "uint256" },
            { "indexed": true, "name": "farmer", "type": "address" },
            { "indexed": false, "name": "amount", "type": "uint256" },
            { "indexed": false, "name": "totalRepayment", "type": "uint256" },
            { "indexed": false, "name": "timestamp", "type": "uint256" }
        ],
        "name": "LoanApproved",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            { "indexed": true, "name": "loanId", "type": "uint256" },
            { "indexed": true, "name": "farmer", "type": "address" },
            { "indexed": false, "name": "reason", "type": "string" },
            { "indexed": false, "name": "timestamp", "type": "uint256" }
        ],
        "name": "LoanRejected",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            { "indexed": true, "name": "loanId", "type": "uint256" },
            { "indexed": true, "name": "farmer", "type": "address" },
            { "indexed": false, "name": "amountPaid", "type": "uint256" },
            { "indexed": false, "name": "remainingAmount", "type": "uint256" },
            { "indexed": false, "name": "timestamp", "type": "uint256" }
        ],
        "name": "LoanRepayment",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            { "indexed": true, "name": "loanId", "type": "uint256" },
            { "indexed": true, "name": "farmer", "type": "address" },
            { "indexed": false, "name": "totalPaid", "type": "uint256" },
            { "indexed": false, "name": "timestamp", "type": "uint256" }
        ],
        "name": "LoanRepaid",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            { "indexed": true, "name": "farmer", "type": "address" },
            { "indexed": false, "name": "timestamp", "type": "uint256" }
        ],
        "name": "FarmerRegistered",
        "type": "event"
    },

    // Read Functions
    {
        "inputs": [],
        "name": "admin",
        "outputs": [{ "name": "", "type": "address" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "loanCounter",
        "outputs": [{ "name": "", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{ "name": "_loanId", "type": "uint256" }],
        "name": "getLoan",
        "outputs": [{
            "components": [
                { "name": "id", "type": "uint256" },
                { "name": "farmer", "type": "address" },
                { "name": "amount", "type": "uint256" },
                { "name": "tenure", "type": "uint256" },
                { "name": "interestRate", "type": "uint256" },
                { "name": "totalRepayment", "type": "uint256" },
                { "name": "amountRepaid", "type": "uint256" },
                { "name": "requestTime", "type": "uint256" },
                { "name": "approvalTime", "type": "uint256" },
                { "name": "authenticityScore", "type": "uint256" },
                { "name": "status", "type": "uint8" },
                { "name": "purpose", "type": "string" },
                { "name": "cropType", "type": "string" }
            ],
            "name": "",
            "type": "tuple"
        }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{ "name": "_farmer", "type": "address" }],
        "name": "getFarmerLoanIds",
        "outputs": [{ "name": "", "type": "uint256[]" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "getTotalLoans",
        "outputs": [{ "name": "", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{ "name": "_farmer", "type": "address" }],
        "name": "isFarmerRegistered",
        "outputs": [{ "name": "", "type": "bool" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{ "name": "_loanId", "type": "uint256" }],
        "name": "getLoanStatusString",
        "outputs": [{ "name": "", "type": "string" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            { "name": "_amount", "type": "uint256" },
            { "name": "_tenure", "type": "uint256" },
            { "name": "_farmerHistory", "type": "uint256" }
        ],
        "name": "calculateAuthenticityScore",
        "outputs": [{ "name": "score", "type": "uint256" }],
        "stateMutability": "pure",
        "type": "function"
    },

    // Write Functions
    {
        "inputs": [{ "name": "_farmer", "type": "address" }],
        "name": "registerFarmer",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{
            "components": [
                { "name": "amount", "type": "uint256" },
                { "name": "tenure", "type": "uint256" },
                { "name": "landSize", "type": "uint256" },
                { "name": "interest", "type": "uint256" },
                { "name": "purpose", "type": "string" }
            ],
            "name": "input",
            "type": "tuple"
        }],
        "name": "requestLoan",
        "outputs": [{ "name": "", "type": "uint256" }],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{ "name": "_loanId", "type": "uint256" }],
        "name": "approveLoan",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            { "name": "_loanId", "type": "uint256" },
            { "name": "_reason", "type": "string" }
        ],
        "name": "rejectLoan",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{ "name": "_loanId", "type": "uint256" }],
        "name": "repayLoan",
        "outputs": [],
        "stateMutability": "payable",
        "type": "function"
    },
    {
        "inputs": [{ "name": "_loanId", "type": "uint256" }],
        "name": "markDefaulted",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{ "name": "_newAdmin", "type": "address" }],
        "name": "transferAdmin",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }
];

module.exports = {
    SHARDEUM_TESTNET,
    CONTRACT_ADDRESS,
    ADMIN_ADDRESS,
    CONTRACT_ABI
};
