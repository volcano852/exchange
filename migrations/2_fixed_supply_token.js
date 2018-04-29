const FixedSupplyToken = artifacts.require("./FixedSupplyToken.sol");
const Exchange = artifacts.require("./Exchange.sol");

module.exports = function(deployer) {
  deployer.deploy(FixedSupplyToken);
  deployer.deploy(Exchange);
};
