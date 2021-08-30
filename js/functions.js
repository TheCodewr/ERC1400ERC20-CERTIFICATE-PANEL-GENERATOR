var eth;

//DETECT METAMASK OR WEB3 PROVIDER
window.addEventListener('load', async () => {
  // Modern dapp browsers...
  if (window.ethereum) {
    window.web3 = new Web3(ethereum);
    try {
      // Request account access if needed
      await ethereum.enable();

      eth = new Eth(web3.currentProvider);

      main();

    } catch (error) {
      console.log(error);
    }
  }
  // Legacy dapp browsers...
  else if (window.web3) {
    window.web3 = new Web3(web3.currentProvider);

    eth = new Eth(web3.currentProvider);
    main();
  }
  // Non-dapp browsers...
  else {
    console.log('Non-Ethereum browser detected. You should consider trying MetaMask!');
  }
});


//MAIN FUNCTION
function main() {

  //CERTIFICATOR SMART CONTRACT ABI
  var ABI = [
    {
      "constant": true,
      "inputs": [
        {
          "name": "sender",
          "type": "address"
        }
      ],
      "name": "checkCount",
      "outputs": [
        {
          "name": "",
          "type": "uint256"
        }
      ],
      "payable": false,
      "stateMutability": "view",
      "type": "function"
    }
  ]

  //CERTIFICATE CONTRACT INSTANCE (THIS ADDRESS CORRESPOND TO A REMIX VM DEPLOYMENT)  
  window.signContract = eth.contract(ABI).at("0xd6291547e30074614389da2e75be0340c83f4f36");
  
}

//GENERATE CERT FUNCTION - CALLED FROM HTML
function generateCertificate() {

  //VARIABLES NEEDED FOR CERT GENERATION
  //PROVIDED BY THE USER
  
  //WALLET ADDRESS OF THE USER USING IT
  var fromAddress = document.getElementById('userAddress').value;
  //ADDRESS OF THE CONTRACT BEING CALLED
  var toAddress = document.getElementById('contractAddress').value;
  //AMOUNT OF ETHER IF ANY
  var value = document.getElementById('sendAmount').value;
  //EXPIRATION TIME FOR THE CERT IN EPOCH TIME: https://www.epochconverter.com/
  var expiration = parseInt(document.getElementById('time').value);
  //VALID DESCRIPTION OF THE CONTRACT FUNCTION BEIGN CALLED
  var funcDec = document.getElementById('funcDec').value;
  //COMMA SEPARATED PARAMETERS TO CALL THE FUNCTION, NOT INCLUDING BYTES DATA PARAMETER
  var funcPar = document.getElementById('funcPar').value;

  //SPLIT PARAMETERS IN CASE MORE THAN ONE
  var funcPars = funcPar.split(",");

  
  // console.log(fromAddress)
  // console.log(toAddress)
  // console.log(value)
  // console.log(expiration)
  // console.log(funcPar)
  // console.log(funcPars);
  
  //CALL TO THE CONTRACT TO CHECK THE CURRENT NONCE OF THE USER
  signContract.checkCount(fromAddress)
  .then(res => {

    var nonce = res[0].toString();
    // console.log(nonce);
    
    //PAYLOAD BEIGN LOADED WITH FIRST PART: FUNCTION HASH
    var payload = web3.utils.sha3(funcDec).substring(2, 10)

    // console.log(payload);

    //GET ABI ENCODED PARAMETERS
    var mySubString = funcDec.substring(
      funcDec.lastIndexOf("(") + 1, 
      funcDec.lastIndexOf(")")
    );
    mySubString = mySubString.split(",")

    // console.log(mySubString);
    // console.log(funcPars);
    //CHECK FUNCTION DEFINITION AND PARAMETERS COUNT  
    if (mySubString.length-1 != funcPars.length){
      alert("Error on function parameter count, don't include data parameter")
      return -1
    }

    //HexFix
    for(el in mySubString){
      if(mySubString[el] == 'byte' || mySubString[el] == 'bytes' || mySubString[el] == 'bytes32'){
        let test = parseInt(funcPars[el],16);
        if (test == 0) {
          console.log("Zero Found => "+funcPars[el])
          funcPars[el] = new Eth.BN(0,16);
          console.log("Changed to BN => "+funcPars[el])
        } else if (mySubString[el] == 'bytes[]' || mySubString[el] == 'bytes32[]'){
          for(le in funcPars[el]){
            let tset = parseInt(funcPars[el][le],16);
            if (tset == 0) {
              console.log("Zero Found => "+funcPars[el][le])
              funcPars[el][le] = new Eth.BN(0,16);
              console.log("Changed to BN => "+funcPars[el][le])
            }
          }
        }
      }
    }

    //Added at the end to not mess the certificate
    funcPars.push(0); //DATA PARAMETER NOT INCLUDED PREVIOUSLY

    // console.log(funcPars);

    //GET ABI ENCODED PARAMETERS
    var testel = ethereumjs.ABI.rawEncode(mySubString,funcPars)

    //FILL ANY LACK OF 0 ON EACH BYTE
    testel.forEach(el => {

      let hex = (parseInt(el).toString(16))

      if(hex.length == 1) hex = "0"+hex;

      payload += hex

    })

    // console.log(payload)

    //FORGE MESSAGE TO BE SIGNED

    // console.log("payload = ",payload);
    
    var mensaje = fromAddress.substring(2);
    mensaje += toAddress.substring(2);
    // console.log("init msg=",mensaje);
    
    value = (parseInt(value) * 1e18).toString(16);
    var newVal = "";
    for(i=0;i < (64-value.length); i++){
      newVal += "0";
    }

    // console.log("value",newVal);

    newVal += value;
    mensaje += newVal;
    // console.log("msg+value=",mensaje);
    
    mensaje += payload.substring(0,payload.length - 64);
    // console.log("msg+payload=",mensaje);
    
    expiration = parseInt(expiration).toString(16);
    newVal = "";
    for(i=0;i < (64-expiration.length); i++){
      newVal += "0";
    }
    // console.log("expiration=",newVal);

    mensaje += newVal+expiration;
    // console.log("msg+expiration=",mensaje);

    nonce = parseInt(nonce).toString(16);
    newVal = "";
    for(i=0;i < (64-nonce.length); i++){
      newVal += "0";
    }
    // console.log("nonce=",newVal);

    mensaje += newVal+nonce;
    // console.log("msg+nonce=",mensaje);

    var test = "0x"+mensaje.toLowerCase();
    // console.log("complete msg=",test);
   
    //GET MESSAGE HASH
    var hash = web3.utils.soliditySha3(test);
    console.log('hash: '+hash);


    web3.eth.getAccounts()
    .then(res => {

      //SIGN HASH
    signature = eth.sign(res[0], hash)
    .then((res) => {

      console.log(res);
      
      const signatureBuffer = ethereumjs.Util.toBuffer(res);
      // console.log(signatureBuffer)

      const signatureParams = ethereumjs.Util.fromRpcSig(signatureBuffer);
      // console.log(signatureParams)

      var expTime = expiration.toString(16);

      //FILL REMAINING REQUIRED BYTES WITH 0's
      while(expTime.length < 64) {
        expTime = "0"+expTime;
      }

      var box = [expTime];
      // console.log(box);

      //FILL ANY LACK OF 0's ON EACH BYTE
      signatureParams.r.forEach(el => {

        let hex = (parseInt(el).toString(16))

        if(hex.length == 1) hex = "0"+hex;

        box.push(hex)

      })
      // console.log(box);

      //FILL ANY LACK OF 0's ON EACH BYTE
      signatureParams.s.forEach(el => {

        let hex = (parseInt(el).toString(16))

        if(hex.length == 1) hex = "0"+hex;
        
        box.push(hex)

      })

      // console.log(box);

      box.push((parseInt(signatureParams.v).toString(16)))
      // console.log(box);

      //FINAL CERTIFICATE
      console.log("Certificate = 0x"+box.join(""));
      alert("Certificate = 0x"+box.join(""));

    });

    })
    
  })
}