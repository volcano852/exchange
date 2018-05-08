var exchangeArtifact = artifacts.require('./Exchange.sol');
var tokenArtifact = artifacts.require('./FixedSupplyToken.sol');

contract('Exchange Order', function (accounts) {
//    it('adding buy order in the exchange order book without enough ether throws an exception' , async function (){
//        let exchange = await exchangeArtifact.deployed();
//        let token = await tokenArtifact.deployed();
//        await exchange.addToken('FAB',token.address);
//        await exchange.depositEther({from:accounts[0],value:2000 - 1});
//
//        let orderId = await exchange.buyToken("FAB",20,100);
//        TODO: test for the exception being thrown
//    })

    it('adding first buy order in the exchange order book will show one buy order book' , async function () {
        let exchange = await exchangeArtifact.deployed();
        let token = await tokenArtifact.deployed();
        await exchange.addToken('FAB',token.address);
        await exchange.depositEther({from:accounts[0],value:10000});

        let orderId_1 = await exchange.buyToken('FAB',20,100);
        let orderBookPricesAndAmount = await exchange.getBuyOrderBookPricesAndAmount('FAB');

        assert.equal(orderBookPricesAndAmount[0].toNumber(),100);
        assert.equal(orderBookPricesAndAmount[1].toNumber(),100);
        assert.equal(orderBookPricesAndAmount[2].toNumber(),20);

        let offersStartAndEnd = await exchange.getBuyOrderBookOffersStartAndEnd('FAB',100);
        assert.equal(offersStartAndEnd[0],1);
        assert.equal(offersStartAndEnd[1],1);

        let offerTraderAndAmount = await exchange.getBuyOrderBookOffersOrderTraderAndAmount('FAB',100,1);
        assert.equal(offerTraderAndAmount[0],accounts[0]);
        assert.equal(offerTraderAndAmount[1],20);
    });
});