pragma solidity ^0.4.21;

import './FixedSupplyToken.sol';
import 'openzeppelin-solidity/contracts/ownership/Ownable.sol';
import 'openzeppelin-solidity/contracts/math/SafeMath.sol';

contract Exchange is Ownable {

    using SafeMath for uint256;

    struct Offer {
        address trader;
        uint amount;
    }

    struct OrderBook {

        uint higherPrice;
        uint lowerPrice;

        mapping(uint => Offer) offers;

        //to represent a queue
        //offers_start == 1 ? an offer exists in the queue
        uint offers_start;
        uint offers_end;
    }

    struct Token {
        string symbolName;

        address tokenContract;

        // price is the key for order book linkedlist
        mapping(uint => OrderBook) buyOrderBook;
        //HEAD of the linked list for the buy order book
        uint highestBuyPrice;
        //TAIL of the linked list for the buy order book
        uint lowestBuyPrice;
        // buy amount across all the book
        uint amountBuy;

        // price is the key for order book linkedlist
        mapping(uint => OrderBook) sellOrderBook;
        //HEAD of the linked list for the sell order book
        uint lowestSellPrice;
        //TAIL of the linked list for the sell order book
        uint highestSellPrice;
        // sell amount across all the book
        uint amountSell;
    }

    // support a maximum of 255 contracts as we start from 1
    mapping(uint8 => Token) tokens;
    uint8 tokenIndex;

    mapping(address => mapping(uint8 => uint)) tokenBalancesForAddress;

    mapping(address => uint) etherBalanceForAddress;

    //////////////
    /// EVENTS ///
    //////////////

    event TokenAdded(address indexed _initiator, uint _timestamp, uint8 indexed _tokenIndex, string _symbolName);

    event TokenDeposited(address indexed _initiator, uint _timestamp, uint8 indexed _tokenIndex, string _symbolName, uint _amount);

    event TokenWithdrawn(address indexed _initiator, uint _timestamp, uint8 indexed _tokenIndex, string _symbolName, uint _amount);

    event EtherDeposited(address indexed _initiator, uint _timestamp, uint _amountInWei);

    event EtherWithdrawn(address indexed _initiator, uint _timestamp, uint _amountInWei);

    ////////////////////
    /// ORDER EVENTS ///
    ////////////////////

    event BuyLimitOrderCreated(address indexed _initiator, uint _timestamp,
        uint8 indexed _tokenIndex, string _symbolName,uint _amount,uint _priceInWei,uint _orderId);

    event SellLimitOrderCreated(address indexed _initiator, uint _timestamp,
        uint8 indexed _tokenIndex, string _symbolName,uint _amount,uint _priceInWei, uint _orderId);

    event BuyLimitOrderCanceled(address indexed _initiator, uint _timestamp,
        uint8 indexed _tokenIndex, string _symbolName,uint _amount,uint _priceInWei, uint _orderId);

    event SellLimitOrderCanceled(address indexed _initiator, uint _timestamp,
        uint8 indexed _tokenIndex, string _symbolName,uint _amount,uint _priceInWei, uint _orderId);

    event BuyLimitOrderFulfilled(address indexed _initiator, uint _timestamp,
        uint8 indexed _tokenIndex, string _symbolName,uint _amount,uint _priceInWei, uint _orderId);

    event SellLimitOrderFulfilled(address indexed _initiator, uint _timestamp,
        uint8 indexed _tokenIndex, string _symbolName,uint _amount,uint _priceInWei, uint _orderId);

    ////////////////////////////////
    /// ETHER DEPOSIT & WITHDRAW ///
    ////////////////////////////////

    function depositEther() public payable {
        etherBalanceForAddress[msg.sender] = etherBalanceForAddress[msg.sender].add(msg.value);
        emit EtherDeposited(msg.sender, now, msg.value);
    }

    function withdrawEther(uint amountInWei) public {
        require(
            amountInWei <= etherBalanceForAddress[msg.sender],
            "amountInWei less than sender ether balance "
        );
        //TODO: Should not allow to withdraw if active order.
        //TODO: Need either to cancel first or withdrawEther should call cancelAllOrder
        //Is there an easy way to know the orders for a user ? Rename the method also if we do that
        etherBalanceForAddress[msg.sender] = etherBalanceForAddress[msg.sender].sub(amountInWei);
        msg.sender.transfer(amountInWei);

        //TODO: move the event because of re entrancy of transfer ?
        emit EtherWithdrawn(msg.sender, now, amountInWei);
    }


    function getBalanceInWei() public constant returns (uint) {
        return etherBalanceForAddress[msg.sender];
    }

    ////////////////////////
    /// TOKEN MANAGEMENT ///
    ////////////////////////

    // Only admin function
    function addToken(string symbolName, address tokenContract) public onlyOwner {
        require(!hasToken(symbolName));
        require(tokenIndex < 255);

        tokenIndex ++;
        tokens[tokenIndex].symbolName = symbolName;
        tokens[tokenIndex].tokenContract = tokenContract;

        emit TokenAdded(msg.sender, now, tokenIndex, symbolName);
    }

    function hasToken(string symbolName) public view returns (bool) {
        uint8 index = getSymbolIndex(symbolName);
        return (index > 0);
    }

    function getSymbolIndex(string symbolName) internal view returns (uint8) {
        for (uint8 i = 1; i <= tokenIndex; i++) {
            Token storage token = tokens[i];
            if (stringsEqual(symbolName, token.symbolName)) {
                return i;
            }
        }
        return 0;
    }

    function stringsEqual(string memory strA, string storage strB) internal view returns (bool) {
        bytes memory strA_bytes = bytes(strA);
        bytes storage strB_bytes = bytes(strB);

        if (strB_bytes.length != strB_bytes.length) {
            return false;
        }
        for (uint8 i = 0; i < strA_bytes.length; i++) {
            if (strA_bytes[i] != strB_bytes[i]) {
                return false;
            }
        }
        return true;
    }


    ////////////////////////////////
    /// TOKEN DEPOSIT & WITHDRAW ///
    ////////////////////////////////


    function depositToken(string symbolName,uint amount) public {
        require(hasToken(symbolName), "token is not referenced in the exchange");

        uint8 idx = getSymbolIndex(symbolName);
        ERC20Interface token = ERC20Interface(tokens[idx].tokenContract);
        require(token.transferFrom(msg.sender,address(this),amount));

        tokenBalancesForAddress[msg.sender][idx] = tokenBalancesForAddress[msg.sender][idx].add(amount);

        emit TokenDeposited(msg.sender, now, idx, symbolName, amount);
    }

    function withdrawToken(string symbolName, uint amount) public {
        require(hasToken(symbolName), "token is not referenced in the exchange");

        //TODO: Should not allow to withdraw the tokens if any active orders
        //TODO: Need either to cancel first or withdrawToken should call cancelAllOrder on sell

        uint8 idx = getSymbolIndex(symbolName);

        uint tokenBalance = tokenBalancesForAddress[msg.sender][idx];
        require(tokenBalance >= amount,"token amount less than sender token balance");

        tokenBalancesForAddress[msg.sender][idx] = tokenBalancesForAddress[msg.sender][idx].sub(amount);

        ERC20Interface token = ERC20Interface(tokens[idx].tokenContract);
        require(token.transfer(msg.sender,amount));

        //TODO: move the event because of the re-entrancy issue (token.transfer) ?
        emit TokenWithdrawn(msg.sender, now, idx, symbolName, amount);
    }

    function getBalanceToken(string symbolName) public view returns (uint) {
        require(hasToken(symbolName), "token is not referenced in the exchange");

        uint8 idx = getSymbolIndex(symbolName);
        return tokenBalancesForAddress[msg.sender][idx];
    }

    /////////////////////////////
    /// ORDER BOOK MANAGEMENT ///
    /////////////////////////////

    ///////// BUY ORDER /////////

    function getBuyOrderBookPricesAndAmount(string symbolName) public view returns (uint, uint, uint) {
        require(hasToken(symbolName), "token is not referenced in the exchange");

        uint8 idx = getSymbolIndex(symbolName);
        Token storage token = tokens[idx];
        return (token.highestBuyPrice, token.lowestBuyPrice, token.amountBuy);
    }

    function getBuyOrderBookOffersStartAndEnd(string symbolName, uint priceInWei) public view returns (uint, uint) {
        require(hasToken(symbolName), "token is not referenced in the exchange");

        uint8 idx = getSymbolIndex(symbolName);
        Token storage token = tokens[idx];
        return (token.buyOrderBook[priceInWei].offers_start, token.buyOrderBook[priceInWei].offers_end);
    }

    function getBuyOrderBookOffersOrderTraderAndAmount(string symbolName, uint priceInWei, uint offerIndex) public view returns (address, uint) {
        require(hasToken(symbolName), "token is not referenced in the exchange");

        uint8 idx = getSymbolIndex(symbolName);
        Token storage token = tokens[idx];
        OrderBook storage orderBook = token.buyOrderBook[priceInWei];
        Offer storage offer = orderBook.offers[offerIndex];
        return (offer.trader, offer.amount);
    }

    function buyToken(string symbolName, uint amount, uint priceInWei) public returns (uint) {
        require(hasToken(symbolName), "token is not referenced in the exchange");

        require(etherBalanceForAddress[msg.sender] >= amount.mul(priceInWei),
            "ether balance for msg.sender is not enough to cover amount * priceInWei");

        uint8 idx = getSymbolIndex(symbolName);
        Token storage token = tokens[idx];
        // 1. check that no matching sell orders. priceInWei <= priceInWei in sell orders (B 200 @ 100 wei <= S 100@90 && S 100@100)
        //TODO: Complete the matching of the sell orders

        // 2. place remaining unfulfilled order quantity at price in the buy order list. ordered by descending order
        uint currentPrice = token.highestBuyPrice;
        while (priceInWei < currentPrice && priceInWei >= token.lowestBuyPrice) {
            currentPrice = token.buyOrderBook[currentPrice].lowerPrice;
        }

        //3. Found the index in the buyOrderBook. Now need to insert it.
        //3.a case if first buy order in the buy order book
        if (token.amountBuy == 0) {
            token.lowestBuyPrice = priceInWei;
            token.highestBuyPrice = priceInWei;
            token.buyOrderBook[priceInWei].offers_start = 1; // to mention a new offer at this price
        }
        //3.b case if priceInWei is the highest price (new head of the list) or first order
        else if (priceInWei > token.highestBuyPrice) {
            token.buyOrderBook[priceInWei].lowerPrice = token.highestBuyPrice;
            token.buyOrderBook[token.highestBuyPrice].higherPrice = priceInWei;
            token.highestBuyPrice = priceInWei;
            token.buyOrderBook[priceInWei].offers_start = 1; // to mention a new offer at this price
        }
        //3.c case if priceInWei is the lowest price (new tail of the list)
        else if (priceInWei < token.lowestBuyPrice) {
            token.buyOrderBook[priceInWei].higherPrice = token.lowestBuyPrice;
            token.buyOrderBook[token.lowestBuyPrice].lowerPrice = priceInWei;
            token.lowestBuyPrice = priceInWei;
            token.buyOrderBook[priceInWei].offers_start = 1;
        }
        //3.d case if priceInWei does not exist in the list
        else if (priceInWei != currentPrice) {
            uint previousHigherPrice = token.buyOrderBook[currentPrice].higherPrice;
            token.buyOrderBook[currentPrice].higherPrice = priceInWei;
            token.buyOrderBook[priceInWei].lowerPrice = currentPrice;
            token.buyOrderBook[previousHigherPrice].lowerPrice = priceInWei;
            token.buyOrderBook[priceInWei].higherPrice = previousHigherPrice;
            token.buyOrderBook[priceInWei].offers_start = 1;
        }

        //4. push the offer in the offer queue
        OrderBook storage orderBook = token.buyOrderBook[priceInWei];
        orderBook.offers_end ++;
        orderBook.offers[orderBook.offers_end] = Offer(msg.sender, amount);

        //5. add to the buy order book total quantity
        token.amountBuy = token.amountBuy.add(amount);

        emit BuyLimitOrderCreated(msg.sender, now, idx, symbolName,amount, priceInWei, 0x7f);

        // 6. return orderId
        return 0x7f;
    }

    ///////// SELL ORDER /////////

    function getSellOrderBookPricesAndAmount(string symbolName) public view returns (uint, uint, uint) {
        require(hasToken(symbolName), "token is not referenced in the exchange");

        uint8 idx = getSymbolIndex(symbolName);
        Token storage token = tokens[idx];
        return (token.lowestSellPrice, token.highestSellPrice, token.amountSell);
    }

    function getSellOrderBookOffersStartAndEnd(string symbolName, uint priceInWei) public view returns (uint, uint) {
        require(hasToken(symbolName), "token is not referenced in the exchange");

        uint8 idx = getSymbolIndex(symbolName);
        Token storage token = tokens[idx];
        return (token.sellOrderBook[priceInWei].offers_start, token.sellOrderBook[priceInWei].offers_end);
    }

    function getSellOrderBookOffersOrderTraderAndAmount(string symbolName, uint priceInWei, uint offerIndex) public view returns (address, uint) {
        require(hasToken(symbolName), "token is not referenced in the exchange");

        uint8 idx = getSymbolIndex(symbolName);
        Token storage token = tokens[idx];
        OrderBook storage orderBook = token.sellOrderBook[priceInWei];
        Offer storage offer = orderBook.offers[offerIndex];
        return (offer.trader, offer.amount);
    }

    function matchBuyOrder(Token storage token,string symbolName, uint8 idx, uint amount, uint priceInWei) internal returns(uint) {
        uint currentBuyPrice = token.highestBuyPrice;
        uint remainingAmount = amount;

        while (currentBuyPrice > 0 && currentBuyPrice >= priceInWei && remainingAmount > 0) {
            OrderBook storage buyOrderBook = token.buyOrderBook[currentBuyPrice];
            uint offer_idx = buyOrderBook.offers_start;
            while (offer_idx <= buyOrderBook.offers_end && remainingAmount > 0) {
                Offer storage offer = buyOrderBook.offers[offer_idx];
                if (remainingAmount >= offer.amount) {
                    remainingAmount -= offer.amount;
                    token.amountBuy -= offer.amount;
                    emit BuyLimitOrderFulfilled(offer.trader,now,idx,symbolName,offer.amount,currentBuyPrice,0x7f);
                    currentBuyPrice = buyOrderBook.lowerPrice;
                    token.highestBuyPrice = currentBuyPrice;
                    buyOrderBook.offers_start ++;
                }
                else {
                    token.amountBuy -= remainingAmount;
                    offer.amount -= remainingAmount;
                    remainingAmount = 0;
                }
                offer_idx ++;
            }
        }
        return remainingAmount;
    }

    function sellToken(string symbolName, uint amount, uint priceInWei) public returns (uint) {
        require(hasToken(symbolName), "token is not referenced in the exchange");

        uint256 tokenBalance = getBalanceToken(symbolName);
        require(amount <= tokenBalance,'token balance for msg.sender is not enough to cover the sell order');
        uint8 idx = getSymbolIndex(symbolName);
        Token storage token = tokens[idx];

        // 1. check that no matching buy orders. priceInWei >= priceInWei in buy orders
        uint remainingAmount = matchBuyOrder(token,symbolName,idx,amount,priceInWei);

        if (remainingAmount == 0) {
            emit SellLimitOrderFulfilled(msg.sender,now,idx,symbolName,amount,priceInWei,0x7f);
            return 0x7f;
        }

        // 2. place remaining unfulfilled order quantity in the sell order book sorted by ascending order
        uint currentPrice = token.lowestSellPrice;
        while (priceInWei > currentPrice && priceInWei <= token.highestSellPrice) {
            currentPrice = token.sellOrderBook[currentPrice].higherPrice;
        }

        //3. Found the index in the sellOrderBook. Now need to insert it.
        //3.a case if first sell order in the sell order book
        if (token.amountSell == 0) {
            token.lowestSellPrice = priceInWei;
            token.highestSellPrice = priceInWei;
            token.sellOrderBook[priceInWei].offers_start = 1; // to mention a new offer at this price
        }
        //3.b case if priceInWei is the lowest price (new head of the list)
        else if (priceInWei < token.lowestSellPrice) {
            token.sellOrderBook[priceInWei].higherPrice = token.lowestSellPrice;
            token.sellOrderBook[token.lowestSellPrice].lowerPrice = priceInWei;
            token.lowestSellPrice = priceInWei;
            token.sellOrderBook[priceInWei].offers_start = 1; // to mention a new offer at this price
        }
        //3.c case if priceInWei is the highest price (new tail of the list)
        else if (priceInWei > token.highestSellPrice) {
            token.sellOrderBook[priceInWei].lowerPrice = token.highestSellPrice;
            token.sellOrderBook[token.highestSellPrice].higherPrice = priceInWei;
            token.highestSellPrice = priceInWei;
            token.sellOrderBook[priceInWei].offers_start = 1; // to mention a new offer at this price
        }
        //3.d case if priceInWei does not exist in the list
        else if (priceInWei != currentPrice) {
            uint previousLowerPrice = token.sellOrderBook[currentPrice].lowerPrice;
            token.sellOrderBook[currentPrice].lowerPrice = priceInWei;
            token.sellOrderBook[priceInWei].higherPrice = currentPrice;
            token.sellOrderBook[previousLowerPrice].higherPrice = priceInWei;
            token.sellOrderBook[priceInWei].lowerPrice = previousLowerPrice;
            token.sellOrderBook[priceInWei].offers_start = 1; // to mention a new offer at this price
        }

        // 4 push the offer in the offer queue
        OrderBook storage orderBook = token.sellOrderBook[priceInWei];
        orderBook.offers_end ++;
        orderBook.offers[orderBook.offers_end] = Offer(msg.sender, remainingAmount);

        //5. add to the sell order book total quantity
        token.amountSell = token.amountSell.add(remainingAmount);

        emit SellLimitOrderCreated(msg.sender, now, idx, symbolName,remainingAmount, priceInWei, 0x7f);

        // 6. return orderId
        return 0x7f;
    }


    //////// CANCEL ORDER ////////

    //
    //    function cancelLimitOrder(string symbolName, bool isSellOrder, uint amount, uint priceInWei) {
    //
    //    }
}

