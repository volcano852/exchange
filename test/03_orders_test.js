var Exchange = artifacts.require('./Exchange.sol');
var Token = artifacts.require('./FixedSupplyToken.sol');

contract('Exchange Order', function (accounts) {
    let exchange;
    let token;

    beforeEach('setup', async function() {
        exchange = await Exchange.new(accounts[0]);
        token = await Token.new();
        await exchange.addToken('FAB',token.address,{from:accounts[0]});
    });

    it('adding buy order in the exchange order book without enough ether throws an exception' , async function (){
        await exchange.depositEther({from:accounts[0],value:2000}); // - 1
        let orderId = exchange.buyToken("FAB",20,100,{from:accounts[0]});
//        TODO: test for the exception being thrown if - 1 
    });

    it('adding first buy order will show one buy order book' , async function () {
        await exchange.depositEther({from:accounts[0],value:10000});

        await exchange.buyToken('FAB',20,100,{from:accounts[0]});

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

     it('adding two buy orders at the same price will show the two orders correctly ordered' , async function () {
        await exchange.depositEther({from:accounts[0],value:10000});
        await exchange.depositEther({from:accounts[1],value:10000});

        await exchange.buyToken('FAB',20,100,{from:accounts[0]});
        await exchange.buyToken('FAB',40,100,{from:accounts[1]});

        let orderBookPricesAndAmount = await exchange.getBuyOrderBookPricesAndAmount('FAB');
        assert.equal(orderBookPricesAndAmount[0].toNumber(),100);
        assert.equal(orderBookPricesAndAmount[1].toNumber(),100);
        assert.equal(orderBookPricesAndAmount[2].toNumber(),60);

        let offersStartAndEnd = await exchange.getBuyOrderBookOffersStartAndEnd('FAB',100);
        assert.equal(offersStartAndEnd[0],1);
        assert.equal(offersStartAndEnd[1],2);

        let offerTraderAndAmount_1 = await exchange.getBuyOrderBookOffersOrderTraderAndAmount('FAB',100,1);
        assert.equal(offerTraderAndAmount_1[0],accounts[0]);
        assert.equal(offerTraderAndAmount_1[1],20);

        let offerTraderAndAmount_2 = await exchange.getBuyOrderBookOffersOrderTraderAndAmount('FAB',100,2);
        assert.equal(offerTraderAndAmount_2[0],accounts[1]);
        assert.equal(offerTraderAndAmount_2[1],40);
    });

    it('adding two buy orders at the same price and a third order will show the orders correctly' , async function () {
        await exchange.depositEther({from:accounts[0],value:10000});
        await exchange.depositEther({from:accounts[1],value:10000});

        await exchange.buyToken('FAB',20,100,{from:accounts[0]});
        await exchange.buyToken('FAB',40,100,{from:accounts[1]});
        await exchange.buyToken('FAB',30,90,{from:accounts[1]});

        let orderBookPricesAndAmount = await exchange.getBuyOrderBookPricesAndAmount('FAB');
        assert.equal(orderBookPricesAndAmount[0].toNumber(),100);
        assert.equal(orderBookPricesAndAmount[1].toNumber(),90);
        assert.equal(orderBookPricesAndAmount[2].toNumber(),90);

        let offersStartAndEnd_100 = await exchange.getBuyOrderBookOffersStartAndEnd('FAB',100);
        assert.equal(offersStartAndEnd_100[0],1);
        assert.equal(offersStartAndEnd_100[1],2);

        let offerTraderAndAmount_1 = await exchange.getBuyOrderBookOffersOrderTraderAndAmount('FAB',100,1);
        assert.equal(offerTraderAndAmount_1[0],accounts[0]);
        assert.equal(offerTraderAndAmount_1[1],20);

        let offerTraderAndAmount_2 = await exchange.getBuyOrderBookOffersOrderTraderAndAmount('FAB',100,2);
        assert.equal(offerTraderAndAmount_2[0],accounts[1]);
        assert.equal(offerTraderAndAmount_2[1],40);

        let offersStartAndEnd_90 = await exchange.getBuyOrderBookOffersStartAndEnd('FAB',90);
        assert.equal(offersStartAndEnd_90[0],1);
        assert.equal(offersStartAndEnd_90[1],1);

        let offerTraderAndAmount_3 = await exchange.getBuyOrderBookOffersOrderTraderAndAmount('FAB',90,1);
        assert.equal(offerTraderAndAmount_3[0],accounts[1]);
        assert.equal(offerTraderAndAmount_3[1],30);
    });
});