var fixedSupplyToken = artifacts.require("./FixedSupplyToken.sol");
var exchangeArtifact = artifacts.require("./exchange.sol");

contract('Exchange', function (accounts) {
    it('deposit and deposit ether should be reflected in the balance', async function () {
        let exchange = await exchangeArtifact.deployed();
        assert.equal(await exchange.getBalanceInWei({from:accounts[0]}),0);
        assert.equal(await exchange.getBalanceInWei({from:accounts[1]}),0);

        let depositEtherResult = await exchange.depositEther({from:accounts[0], value:100});
        assert.equal(depositEtherResult.logs[0].event,"EtherDeposited")
        assert.equal(depositEtherResult.logs[0].args._initiator,accounts[0]);
        assert.equal(depositEtherResult.logs[0].args._amountInWei,100);

        assert.equal(await exchange.getBalanceInWei({from:accounts[0]}),100);
        assert.equal(await exchange.getBalanceInWei({from:accounts[1]}),0);

        let withdrawEtherResult = await exchange.withdrawEther(20, {from:accounts[0]});
        assert.equal(withdrawEtherResult.logs[0].event,"EtherWithdrawn")
        assert.equal(withdrawEtherResult.logs[0].args._initiator,accounts[0]);
        assert.equal(withdrawEtherResult.logs[0].args._amountInWei,20);

        assert.equal(await exchange.getBalanceInWei({from:accounts[0]}),80);
        assert.equal(await exchange.getBalanceInWei({from:accounts[1]}),0);
    });

    it('deposit and withdraw token to the exchange', async function () {
        let token = await fixedSupplyToken.deployed();
        let exchange = await exchangeArtifact.deployed();

        await token.approve(exchange.address,100,{from:accounts[0]});

        let addTokenResult = await exchange.addToken("FAB",token.address);
        assert.equal(addTokenResult.logs[0].event,"TokenAdded")
        assert.equal(addTokenResult.logs[0].args._initiator,accounts[0]);
        assert.equal(addTokenResult.logs[0].args._tokenIndex,1);
        assert.equal(addTokenResult.logs[0].args._symbolName,"FAB");

        let depositTokenResult = await exchange.depositToken("FAB",100,{from:accounts[0]});
        assert.equal(depositTokenResult.logs[0].event,"TokenDeposited")
        assert.equal(depositTokenResult.logs[0].args._initiator,accounts[0]);
        assert.equal(depositTokenResult.logs[0].args._tokenIndex,1);
        assert.equal(depositTokenResult.logs[0].args._symbolName,"FAB");
        assert.equal(depositTokenResult.logs[0].args._amount,100);

        assert.equal((await exchange.getBalanceToken("FAB",{from:accounts[0]})),100);
        assert.equal(await token.balanceOf(exchange.address),100);
        assert.equal((await token.balanceOf(accounts[0])).toNumber(),999900);

        let withdrawTokenResult = await exchange.withdrawToken("FAB",75);
        assert.equal((await token.balanceOf(accounts[0])).toNumber(),999975);
        assert.equal(await token.balanceOf(exchange.address),25);
        assert.equal((await exchange.getBalanceToken("FAB",{from:accounts[0]})).toNumber(),25);

        assert.equal(withdrawTokenResult.logs[0].event,"TokenWithdrawn")
        assert.equal(withdrawTokenResult.logs[0].args._initiator,accounts[0]);
        assert.equal(withdrawTokenResult.logs[0].args._tokenIndex,1);
        assert.equal(withdrawTokenResult.logs[0].args._symbolName,"FAB");
        assert.equal(withdrawTokenResult.logs[0].args._amount,75);
    });
});