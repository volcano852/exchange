var fixedSupplyToken = artifacts.require("./FixedSupplyToken.sol");

contract('MyToken', function (accounts) {
    it('first account should have the tokens at the beginning', function() {
        var _totalSupply;
        var myTokenInstance;

        return fixedSupplyToken.deployed().then(function (instance) {
            myTokenInstance = instance;
            return myTokenInstance.totalSupply.call();
        }).then(function (totalSupply) {
            _totalSupply = totalSupply;
            return myTokenInstance.balanceOf(accounts[0]);
        }).then(function (balanceAccountOwner) {
            assert.equal(balanceAccountOwner.toNumber(),_totalSupply.toNumber(),"Total number of tokens is owned by owner");
        });
    });

    it('second account should have no token at the beginning', function() {
        var myTokenInstance;

        return fixedSupplyToken.deployed().then(function (instance) {
            myTokenInstance = instance;
            return myTokenInstance.balanceOf(accounts[1]);
        }).then(function (balanceAccountSecond) {
            assert.equal(balanceAccountSecond.toNumber(),0,"Total number of tokens is owner by second account");
        });
    });

    it('first account should have 750 000 tokens left when he is transferring 250 000 of them to accounts[1]', function() {

        var token;
        var _account0_before;
        var _account1_before;

        var _account0_after;
        var _account1_after;

        return fixedSupplyToken.deployed().then(function (instance) {
            token = instance;
            return token.balanceOf(accounts[0]);
        }).then(function (balance) {
            _account0_before = balance;
            return token.balanceOf(accounts[1]);
        }).then(function (balance) {
            _account1_before = balance;
            return token.transfer(accounts[1],250000,{from:accounts[0]});
        }).then(function () {
            return token.balanceOf(accounts[0]);
        }).then(function (balance) {
            _account0_after = balance;
            return token.balanceOf(accounts[1]);
        }).then(function (balance) {
            _account1_after = balance;
            assert.equal(_account0_before,1000000,"The owner has 1 000 000 tokens before transfer");
            assert.equal(_account1_before,0,"Accounts[1] has no token before transfer");
            assert.equal(_account0_after,750000,"The owner has 750 000 tokens after the transfer");
            assert.equal(_account1_after,250000,"Accounts[1] has 250 000 tokens after the transfer");
        });
    });
});