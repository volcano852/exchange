var fixedSupplyToken = artifacts.require("./FixedSupplyToken.sol");
var exchangeArtifact = artifacts.require("./exchange.sol");

contract('Exchange', function (accounts) {
    it('deposit and deposit ether should be reflected in the balance', async function () {
        let exchange = await exchangeArtifact.deployed();
        assert.equal(await exchange.getBalanceInWei({from:accounts[0]}),0);
        assert.equal(await exchange.getBalanceInWei({from:accounts[1]}),0);

        await exchange.depositEther({from:accounts[0], value:100});

        assert.equal(await exchange.getBalanceInWei({from:accounts[0]}),100);
        assert.equal(await exchange.getBalanceInWei({from:accounts[1]}),0);

        await exchange.withdrawEther(20, {from:accounts[0]});

        assert.equal(await exchange.getBalanceInWei({from:accounts[0]}),80);
        assert.equal(await exchange.getBalanceInWei({from:accounts[1]}),0);
    });

    it('deposit and withdraw token to the exchange', async function () {
        let token = await fixedSupplyToken.deployed();
        let exchange = await exchangeArtifact.deployed();

        await token.approve(exchange.address,100,{from:accounts[0]});
        await exchange.addToken("FAB",token.address);
        await exchange.depositToken("FAB",100,{from:accounts[0]});

        assert.equal((await exchange.getBalanceToken("FAB",{from:accounts[0]})),100);
        assert.equal(await token.balanceOf(exchange.address),100);
        assert.equal((await token.balanceOf(accounts[0])).toNumber(),999900);

        await exchange.withdrawToken("FAB",75);
        assert.equal((await token.balanceOf(accounts[0])).toNumber(),999975);
        assert.equal(await token.balanceOf(exchange.address),25);
        assert.equal((await exchange.getBalanceToken("FAB",{from:accounts[0]})).toNumber(),25);
    });
});