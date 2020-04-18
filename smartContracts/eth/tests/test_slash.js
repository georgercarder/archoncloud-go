// // TODO UPDATE
module.exports = () => {
var zeroPad = function(input, padLength) {
  var zero = '0';
  var ret = input;
  while (ret.length < padLength) {
    ret = zero + ret;
  }
  return ret;
}

var TestSlash = function () {}
TestSlash.prototype.run = function(testParams) {
  const abi = testParams.abi;
  const code = testParams.code;
  const contractAddress = testParams.contractAddress;
  var wallet = testParams.wallets[0]; 
  var wallets = testParams.wallets;
  var web3 = testParams.web3;
  
  var deployContract = () => {
    web3.eth.getTransactionCount(wallet.address, 'pending')
    .then(nonce => {
      web3.eth.estimateGas(
        {from: wallet.address, nonce: nonce, data: code}
      )
      .then( est => {
        fee = est + 10000;
        wallet.signTransaction({from:wallet.address, gas: fee, nonce: nonce, data: code})
        .then(ret => {
          web3.eth.sendSignedTransaction(ret.rawTransaction)
          .on('transactionHash', (transactionHash) => {
          })
          .on('receipt', (receipt) => {
              runTests(receipt.contractAddress);
          })
          .catch(err => {
            if (err.toString().indexOf("correct nonce") > -1) {
              deployContract();
            }
          });
          });
      })
      .catch(err => {
        if (err.toString().indexOf("correct nonce") > -1) {
          deployContract();
        }
      });
    });
  } 
  deployContract();
  
  var runTests = (contractAddress) => {
    var myContract = new web3.eth.Contract(abi, contractAddress, {defaultAccount: wallet.address});
    // TEST UNREGISTERSP 

    // 0 slaLevel
    const maxSLALevel = 8;
    var slaLevel = Math.floor(Math.random() * maxSLALevel);
    const encSlaLevel = zeroPad(slaLevel.toString('16'), 2); 
    
    // 1 availableStorage
    var availableStorage = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
    var encAvailableStorage = zeroPad(availableStorage.toString('16'), 16);
    // 2 bandwidth
    var bandwidth = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
    var encBandwidth = zeroPad(bandwidth.toString('16'), 16);
    // 3 min ask price
    var minAskPrice = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
    var encMinAskPrice = zeroPad(minAskPrice.toString('16'), 16);
    // 4 country code
    var cc0 = 233;
    var cc1 = 1;
    var cc = zeroPad(cc0.toString('16'), 2) + zeroPad(cc1.toString('16'), 2);

    var params = encSlaLevel + encAvailableStorage + encBandwidth + encMinAskPrice + cc + "0000000000";

    params = params.replace("0x", "");
    params = Buffer.from(params, 'hex');
    var nodeID = web3.utils.sha3("some/upload/Url");
    nodeID = nodeID.replace("0x", "");
    nodeID = Buffer.from(nodeID, 'hex');
    var hardwareProof = web3.utils.sha3("some preimage of hardwareProof");
    hardwareProof = hardwareProof.replace("0x", "");
    hardwareProof = Buffer.from(hardwareProof, 'hex');
    var stakePmt = 1000000000000000;
    
    // first registersp
    var initialRegisterSP = function() {
      web3.eth.getTransactionCount(wallets[1].address, 'pending')
      .then(nonce => {
        /*myContract.methods.registerSP(params).estimateGas()
        .then(est => {
          console.log(est);*/
          var encoded = myContract.methods.registerSP(params, nodeID, hardwareProof).encodeABI();
          wallets[1].signTransaction({from:wallets[1].address, to: contractAddress, gas: 6721974/*est*/, nonce: nonce, data: encoded, value: stakePmt})// here
            .then(ret => {
            web3.eth.sendSignedTransaction(ret.rawTransaction)
            .on('transactionHash', (transactionHash) => {
              slashAndTest(); 
            })
            .on('receipt', (receipt) => {
              //console.log(receipt)
            })
            .catch(err => { 
              if (err.toString().indexOf("correct nonce") > -1) {
                setTimeout(() => {initialRegisterSP()}, 100);
              }
            });
            });
        //});
      })
      .catch(err => { 
        if (err.toString().indexOf("correct nonce") > -1) {
          setTimeout(() => {initialRegisterSP()}, 100);
        }
      });
    }
    initialRegisterSP();
    
    var slashAndTest = () => {
      // slash 
      var hashReference = web3.utils.sha3('some sha image of proof supporting this slash');
      hashReference = hashReference.replace("0x", "");
      hashReference = Buffer.from(hashReference, 'hex');
      var amountToSlash = Math.floor(Math.random() * 2 * stakePmt);// some random amount
      var spToSlash = wallets[1].address;
      web3.eth.getTransactionCount(wallet.address, 'pending')
        .then(nonce => {
          /*myContract.methods.registerSP(params).estimateGas()
          .then(est => {
            console.log(est);*/
            var encoded = myContract.methods.slashStake(hashReference, amountToSlash, spToSlash).encodeABI();
            wallet.signTransaction({from:wallet.address, to: contractAddress, gas: 6721974/*est*/, nonce: nonce, data: encoded})// here
              .then(ret => {
              web3.eth.sendSignedTransaction(ret.rawTransaction)
              .on('transactionHash', (transactionHash) => {
                testSlash(amountToSlash, spToSlash);
              })
              .on('receipt', (receipt) => {
                //console.log(receipt)
              })
              .catch(err => { 
                //console.log(err);
                if (err.toString().indexOf("correct nonce") > -1) {
                  setTimeout(() => {slashAndTest()}, 100);
                }
              });
              });
          //});
        })
        .catch(err => { 
          if (err.toString().indexOf("correct nonce") > -1) {
            setTimeout(() => {slashAndTest()}, 100);
          }
        });
      }

    var testSlash = (amountToSlash, spToSlash) => {
      myContract.methods.spAddress2SPProfile(spToSlash).call()
      .then(res => {
        if (parseInt(res.slash) === amountToSlash 
          && res.inGoodStanding === false) {
          testParams.testsPassed++; 
          console.log("passed slashStake");
        } else {
          testParams.testsFailed++;
          console.log("failed slashStake");
        }
      });
    }

    // TODO TEST SLASH WHEN SP HAS MASSIVE EARNINGS
  }
};
  return new TestSlash;
};// module.exports
