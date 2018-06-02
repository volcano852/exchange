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

    ///////////////////////
    /// BUY ORDER TESTS ///
    ///////////////////////

    it('adding buy order in the exchange order book without enough ether throws an exception' , async function () {
        await exchange.depositEther({from:accounts[0],value:2000}); // - 1
        let orderId = exchange.buyToken("FAB",20,100,{from:accounts[0]});
//        TODO: test for the exception being thrown if - 1 
    });

    it('buyToken in an empty order book will add one buy limit order' , async function () {
        await exchange.depositEther({from:accounts[0],value:10000});

        await exchange.buyToken('FAB',20,100,{from:accounts[0]});

        assert.equal(await exchange.getBalanceInWei({from:accounts[0]}),10000 - 20 * 100);
        assert.equal((await exchange.getBalanceToken('FAB',{from:accounts[0]})),0);

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

        assert.equal(await exchange.getBalanceInWei({from:accounts[0]}),10000 - 20 * 100);
        assert.equal(await exchange.getBalanceInWei({from:accounts[1]}),10000 - 40 * 100);
        assert.equal((await exchange.getBalanceToken('FAB',{from:accounts[0]})),0);
        assert.equal((await exchange.getBalanceToken('FAB',{from:accounts[1]})),0);

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

        assert.equal(await exchange.getBalanceInWei({from:accounts[0]}),10000 - 20 * 100);
        assert.equal(await exchange.getBalanceInWei({from:accounts[1]}),10000 - 40 * 100 - 30 * 90);
        assert.equal((await exchange.getBalanceToken('FAB',{from:accounts[0]})),0);
        assert.equal((await exchange.getBalanceToken('FAB',{from:accounts[0]})),0);

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

    ////////////////////////
    /// SELL ORDER TESTS ///
    ////////////////////////

    it('adding sell order in the exchange order book without enough tokens throws an exception' , async function () {
        await token.approve(exchange.address,2000,{from:accounts[0]});
        await exchange.depositToken('FAB',2000,{from:accounts[0]});
        let orderId = exchange.sellToken('FAB',20,100,{from:accounts[0]}); // - 1
//        TODO: test for the exception being thrown if - 1
    });

    it('sellToken in an empty order book will add one sell limit order' , async function () {
        await token.approve(exchange.address,2000,{from:accounts[0]});
        await exchange.depositToken('FAB',2000,{from:accounts[0]});

        await exchange.sellToken('FAB',40,110,{from:accounts[0]});

        assert.equal((await exchange.getBalanceToken('FAB',{from:accounts[0]})),2000 - 40);
        assert.equal(await exchange.getBalanceInWei({from:accounts[0]}),0);

        let orderBookPricesAndAmount = await exchange.getSellOrderBookPricesAndAmount('FAB');
        assert.equal(orderBookPricesAndAmount[0].toNumber(),110);
        assert.equal(orderBookPricesAndAmount[1].toNumber(),110);
        assert.equal(orderBookPricesAndAmount[2].toNumber(),40);

        let offersStartAndEnd = await exchange.getSellOrderBookOffersStartAndEnd('FAB',110);
        assert.equal(offersStartAndEnd[0],1);
        assert.equal(offersStartAndEnd[1],1);

        let offerTraderAndAmount = await exchange.getSellOrderBookOffersOrderTraderAndAmount('FAB',110,1);
        assert.equal(offerTraderAndAmount[0],accounts[0]);
        assert.equal(offerTraderAndAmount[1],40);
    });

     it('adding two sell orders at the same price will show the two orders correctly sorted' , async function () {
        await token.transfer(accounts[1],2000,{from:accounts[0]});

        await token.approve(exchange.address,2000,{from:accounts[0]});
        await token.approve(exchange.address,2000,{from:accounts[1]});

        await exchange.depositToken('FAB',2000,{from:accounts[0]});
        await exchange.depositToken('FAB',2000,{from:accounts[1]});

        await exchange.sellToken('FAB',40,110,{from:accounts[0]});
        await exchange.sellToken('FAB',80,110,{from:accounts[1]});

        assert.equal((await exchange.getBalanceToken('FAB',{from:accounts[0]})),2000 - 40);
        assert.equal((await exchange.getBalanceToken('FAB',{from:accounts[1]})),2000 - 80);
        assert.equal(await exchange.getBalanceInWei({from:accounts[0]}),0);
        assert.equal(await exchange.getBalanceInWei({from:accounts[1]}),0);

        let orderBookPricesAndAmount = await exchange.getSellOrderBookPricesAndAmount('FAB');
        assert.equal(orderBookPricesAndAmount[0].toNumber(),110);
        assert.equal(orderBookPricesAndAmount[1].toNumber(),110);
        assert.equal(orderBookPricesAndAmount[2].toNumber(),120);

        let offersStartAndEnd = await exchange.getSellOrderBookOffersStartAndEnd('FAB',110);
        assert.equal(offersStartAndEnd[0],1);
        assert.equal(offersStartAndEnd[1],2);

        let offerTraderAndAmount_1 = await exchange.getSellOrderBookOffersOrderTraderAndAmount('FAB',110,1);
        assert.equal(offerTraderAndAmount_1[0],accounts[0]);
        assert.equal(offerTraderAndAmount_1[1],40);

        let offerTraderAndAmount_2 = await exchange.getSellOrderBookOffersOrderTraderAndAmount('FAB',110,2);
        assert.equal(offerTraderAndAmount_2[0],accounts[1]);
        assert.equal(offerTraderAndAmount_2[1],80);
    });

    it('adding two sell orders at the same price and a third sell order will show the orders correctly' , async function () {
        await token.transfer(accounts[1],2000,{from:accounts[0]});

        await token.approve(exchange.address,2000,{from:accounts[0]});
        await token.approve(exchange.address,2000,{from:accounts[1]});

        await exchange.depositToken('FAB',2000,{from:accounts[0]});
        await exchange.depositToken('FAB',2000,{from:accounts[1]});

        await exchange.sellToken('FAB',40,110,{from:accounts[0]});
        await exchange.sellToken('FAB',80,110,{from:accounts[1]});
        await exchange.sellToken('FAB',60,120,{from:accounts[1]});

        assert.equal((await exchange.getBalanceToken("FAB",{from:accounts[0]})),2000 - 40);
        assert.equal((await exchange.getBalanceToken("FAB",{from:accounts[1]})),2000 - 80 - 60);
        assert.equal(await exchange.getBalanceInWei({from:accounts[0]}),0);
        assert.equal(await exchange.getBalanceInWei({from:accounts[1]}),0);

        let orderBookPricesAndAmount = await exchange.getSellOrderBookPricesAndAmount('FAB');
        assert.equal(orderBookPricesAndAmount[0].toNumber(),110);
        assert.equal(orderBookPricesAndAmount[1].toNumber(),120);
        assert.equal(orderBookPricesAndAmount[2].toNumber(),180);

        let offersStartAndEnd_110 = await exchange.getSellOrderBookOffersStartAndEnd('FAB',110);
        assert.equal(offersStartAndEnd_110[0],1);
        assert.equal(offersStartAndEnd_110[1],2);

        let offerTraderAndAmount_1 = await exchange.getSellOrderBookOffersOrderTraderAndAmount('FAB',110,1);
        assert.equal(offerTraderAndAmount_1[0],accounts[0]);
        assert.equal(offerTraderAndAmount_1[1],40);

        let offerTraderAndAmount_2 = await exchange.getSellOrderBookOffersOrderTraderAndAmount('FAB',110,2);
        assert.equal(offerTraderAndAmount_2[0],accounts[1]);
        assert.equal(offerTraderAndAmount_2[1],80);

        let offersStartAndEnd_120 = await exchange.getSellOrderBookOffersStartAndEnd('FAB',120);
        assert.equal(offersStartAndEnd_120[0],1);
        assert.equal(offersStartAndEnd_120[1],1);

        let offerTraderAndAmount_3 = await exchange.getSellOrderBookOffersOrderTraderAndAmount('FAB',120,1);
        assert.equal(offerTraderAndAmount_3[0],accounts[1]);
        assert.equal(offerTraderAndAmount_3[1],60);
    });

    it('adding first buy orders and then adding sell orders will trigger orders matching when selling' , async function () {
        await exchange.depositEther({from:accounts[0],value:20000});
        await exchange.depositEther({from:accounts[1],value:20000});
        await token.transfer(accounts[1],2000,{from:accounts[0]});
        await token.transfer(accounts[2],2000,{from:accounts[0]});

        await token.approve(exchange.address,2000,{from:accounts[0]});
        await token.approve(exchange.address,2000,{from:accounts[1]});
        await token.approve(exchange.address,2000,{from:accounts[2]});

        await exchange.depositToken('FAB',2000,{from:accounts[0]});
        await exchange.depositToken('FAB',2000,{from:accounts[1]});
        await exchange.depositToken('FAB',2000,{from:accounts[2]});

        await exchange.buyToken('FAB',70,110,{from:accounts[0]});
        await exchange.buyToken('FAB',20,110,{from:accounts[1]});
        await exchange.buyToken('FAB',70,100,{from:accounts[1]});

        await exchange.sellToken('FAB',100,100,{from:accounts[2]});
        // 70@110 buy order fulfilled
        // 20@100 buy order fulfilled
        // 10@100 partial executed. left 60@100

        assert.equal((await exchange.getBalanceToken('FAB',{from:accounts[0]})),2000 + 70);
        assert.equal((await exchange.getBalanceToken('FAB',{from:accounts[1]})),2000 + 20 + 10);
        assert.equal((await exchange.getBalanceToken('FAB',{from:accounts[2]})),2000 - 100);
        assert.equal(await exchange.getBalanceInWei({from:accounts[0]}),20000 - 70 * 110);
        assert.equal(await exchange.getBalanceInWei({from:accounts[1]}),20000 - 20 * 110 - 70 * 100);
        assert.equal(await exchange.getBalanceInWei({from:accounts[2]}),70 * 110 + 20 * 110 + 10 * 100);
        // the 60 * 100 remaining wei are not stored anywhere in the exchange
        // as they are paid upfront when buying tokens and not increased in some escrow account for example

        let buyOrderBookPricesAndAmount = await exchange.getBuyOrderBookPricesAndAmount('FAB');
        assert.equal(buyOrderBookPricesAndAmount[0].toNumber(),100);
        assert.equal(buyOrderBookPricesAndAmount[1].toNumber(),100);
        assert.equal(buyOrderBookPricesAndAmount[2].toNumber(),60);

        let sellOrderBookPricesAndAmount = await exchange.getSellOrderBookPricesAndAmount('FAB');
        assert.equal(sellOrderBookPricesAndAmount[0].toNumber(),0);
        assert.equal(sellOrderBookPricesAndAmount[1].toNumber(),0);
        assert.equal(sellOrderBookPricesAndAmount[2].toNumber(),0);

        let offersStartAndEnd_100 = await exchange.getBuyOrderBookOffersStartAndEnd('FAB',100);
        assert.equal(offersStartAndEnd_100[0],1);
        assert.equal(offersStartAndEnd_100[1],1);

        let offerTraderAndAmount_1 = await exchange.getBuyOrderBookOffersOrderTraderAndAmount('FAB',100,1);
        assert.equal(offerTraderAndAmount_1[0],accounts[1]);
        assert.equal(offerTraderAndAmount_1[1],60);
    });

    it('adding first sell orders and then adding buy orders will trigger orders matching when buying' , async function () {
        await exchange.depositEther({from:accounts[0],value:20000});
        await exchange.depositEther({from:accounts[1],value:20000});
        await exchange.depositEther({from:accounts[2],value:20000});

        await token.transfer(accounts[1],2000,{from:accounts[0]});
        await token.transfer(accounts[2],2000,{from:accounts[0]});

        await token.approve(exchange.address,2000,{from:accounts[0]});
        await token.approve(exchange.address,2000,{from:accounts[1]});
        await token.approve(exchange.address,2000,{from:accounts[2]});

        await exchange.depositToken('FAB',2000,{from:accounts[0]});
        await exchange.depositToken('FAB',2000,{from:accounts[1]});
        await exchange.depositToken('FAB',2000,{from:accounts[2]});

        await exchange.sellToken('FAB',70,110,{from:accounts[0]});
        await exchange.sellToken('FAB',90,100,{from:accounts[1]});
        await exchange.sellToken('FAB',50,100,{from:accounts[0]});

        await exchange.buyToken('FAB',150,105,{from:accounts[2]});

        // 50@100 sell order fulfilled
        // 90@100 sell order fulfilled
        // 70@110 sell order added
        //
        // 10@105 buy order added. left 10@105

        assert.equal((await exchange.getBalanceToken('FAB',{from:accounts[0]})),2000 - 50 - 70);
        assert.equal((await exchange.getBalanceToken('FAB',{from:accounts[1]})),2000 - 90);
        assert.equal((await exchange.getBalanceToken('FAB',{from:accounts[2]})),2000 + 140);

        assert.equal(await exchange.getBalanceInWei({from:accounts[0]}),20000 + 50 * 100);
        assert.equal(await exchange.getBalanceInWei({from:accounts[1]}),20000 + 90 * 100);
        assert.equal(await exchange.getBalanceInWei({from:accounts[2]}),20000 - 140 * 100 - 10 * 105);

        let sellOrderBookPricesAndAmount = await exchange.getSellOrderBookPricesAndAmount('FAB');
        assert.equal(sellOrderBookPricesAndAmount[0].toNumber(),110);
        assert.equal(sellOrderBookPricesAndAmount[1].toNumber(),110);
        assert.equal(sellOrderBookPricesAndAmount[2].toNumber(),70);

        let buyOrderBookPricesAndAmount = await exchange.getBuyOrderBookPricesAndAmount('FAB');
        assert.equal(buyOrderBookPricesAndAmount[0].toNumber(),105);
        assert.equal(buyOrderBookPricesAndAmount[1].toNumber(),105);
        assert.equal(buyOrderBookPricesAndAmount[2].toNumber(),10);

        let offersStartAndEnd_105 = await exchange.getBuyOrderBookOffersStartAndEnd('FAB',105);
        assert.equal(offersStartAndEnd_105[0],1);
        assert.equal(offersStartAndEnd_105[1],1);

        let offerTraderAndAmount_1 = await exchange.getBuyOrderBookOffersOrderTraderAndAmount('FAB',105,1);
        assert.equal(offerTraderAndAmount_1[0],accounts[2]);
        assert.equal(offerTraderAndAmount_1[1],10);
    });
});