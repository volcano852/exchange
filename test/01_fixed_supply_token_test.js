var fixedSupplyToken = artifacts.require("./FixedSupplyToken.sol");
var exchangeArtifact = artifacts.require("./exchange.sol");

contract('MyToken', function (accounts) {
    it('the total supply is what it is supposed to be', async function () {
        let token = await fixedSupplyToken.deployed();
        let totalSupply = await token.totalSupply.call();
        assert.equal(totalSupply.valueOf(),1000000);
    });

    it('first account should have the tokens at the beginning', async function () {
        let token = await fixedSupplyToken.deployed();
        let totalSupply = await token.totalSupply.call();
        let balanceAccountOwner = await token.balanceOf(accounts[0]);
        assert.equal(balanceAccountOwner.toNumber(),totalSupply.toNumber(),"Total number of tokens is owned by owner");
    });

    it('second account should have no token at the beginning', async function() {
        let token = await fixedSupplyToken.deployed();
        let balanceAccountSecond = await token.balanceOf(accounts[1]);
        assert.equal(balanceAccountSecond.toNumber(),0,"Total number of tokens is owner by second account");
    });

    it('first account should have 750 000 tokens left when he is transferring 250 000 of them to accounts[1]', async function() {
        let token = await fixedSupplyToken.deployed();
        let account0_before = await token.balanceOf(accounts[0]);
        let account1_before = await token.balanceOf(accounts[1]);
        await token.transfer(accounts[1],250000,{from:accounts[0]});
        let account0_after = await token.balanceOf(accounts[0]);
        let account1_after = await token.balanceOf(accounts[1]);
        assert.equal(account0_before,1000000,"The owner has 1 000 000 tokens before transfer");
        assert.equal(account1_before,0,"Accounts[1] has no token before transfer");
        assert.equal(account0_after,750000,"The owner has 750 000 tokens after the transfer");
        assert.equal(account1_after,250000,"Accounts[1] has 250 000 tokens after the transfer");
    });

    it('adding a new token should be reflected in the hasToken function', async function() {
        let token = await fixedSupplyToken.deployed();
        let exchange = await exchangeArtifact.deployed();
        assert.isFalse(await exchange.hasToken("FAB"),"FAB token is not registered in the exchange");
        assert.isFalse(await exchange.hasToken("TOM"),"TOM token is not registered in the exchange");
        assert.isFalse(await exchange.hasToken("VIN"),"VIN token is not registered in the exchange");

        await exchange.addToken("FAB",token.address);
        assert.isTrue(await exchange.hasToken("FAB"),"FAB is added to the exchange");
        assert.isFalse(await exchange.hasToken("TOM"),"TOM token is not registered in the exchange");
        assert.isFalse(await exchange.hasToken("VIN"),"VIN token is not registered in the exchange");

        await exchange.addToken("TOM",token.address);
        assert.isTrue(await exchange.hasToken("FAB"),"FAB is added to the exchange");
        assert.isTrue(await exchange.hasToken("TOM"),"TOM is added to the exchange");
        assert.isFalse(await exchange.hasToken("VIN"),"VIN token is not registered in the exchange");
    });
});