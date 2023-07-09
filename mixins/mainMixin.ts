
import MetaMaskSDK from '@metamask/sdk';
import FHEMixin from '../mixins/fhe';
import globalMixin from '../mixins/globalMixin';

//import Web3 from 'web3'
import { ethers } from "ethers";


import ABIENC from '../assets/erc20enc.json';
import ABI from '../assets/erc20.json';
import appConfig from '../config/appConfig.json'

import encryptionOn from '../assets/lottie/encryption-on.json'
import audioFile from '~/assets/audio/encryption-on.mp3'


// They should be non-reactive variables
var web3Provider;
var web3Signer;

const fromHexString = (hexString: string): Uint8Array => {
  const arr = hexString.replace(/^(0x)/, '').match(/.{1,2}/g);
  if (!arr) return new Uint8Array();
  return Uint8Array.from(arr.map((byte) => parseInt(byte, 16)));
};

export default {
  mixins: [FHEMixin, globalMixin],    


  created() {
    console.log(`Created!`);
  },
  mounted() {
    this.mmsdk = new MetaMaskSDK();
    this.metamask = this.mmsdk.getProvider(); // You can also access via window.ethereum

    console.log(`Mounted!`, this.metamask)

    var connectedBefore = window.localStorage.getItem('connectedBefore');
    if (connectedBefore) {
      this.connect();
    }

    var alreadySawTip = window.localStorage.getItem('alreadySawTip');
    if (alreadySawTip) {
      this.showEncryptionInfo = false;
    }
    this.loadHistory();

  },
  data() {
    return {
      mmsdk: null,
      metamask: null,
      enableEncryption: false,
      encryptionOn: encryptionOn,
      showEncryptionAnimation: false,
      showSendTokensScreen: false,
      pageIdx: 0,
      account: "",
      balance: -1,
      walletBalance: 0,
      walletBalanceChecking: false,
      recipientAddress: "",
      activeContract: null,
      loadingContract: false,
      minting: false,
      info: "", 
      showSend: false,
      transferring: false,
      explorer: appConfig.BLOCK_EXPLORER,
      showEncryptionInfo: true,
      amountRules: [
        value => {
          if (value) return true

          return 'Amount is requred.'
        },
        value => {
          if (value > 0) {
            if (value % 1 != 0) {
              return 'Decimal numbers are not allowed'
            }
            return true;
          }
          return 'Amount must be greater than 0.'
        },
      ],
      recipientRules: [
        value => {
          if (value) return true

          return 'Recipient is requred.'
        }
      ],
      audioSource: audioFile,
      history: new Map(),
      historyHeaders: [
        { text: 'Transaction', value: 'tx' },
        { text: 'Encrypted', value: 'enctrypted' },
        { text: 'Status', value: 'status' }
      ]
    }
  }, 
  watch: {
    enableEncryption(state) {
      var self = this;
      this.showEncryptionAnimation = true;
      let bgVideo = document.getElementById("background-video");
      let cssName = "enc-bg";
      if (state === true) {
        setTimeout(() => {
          self.$refs.lottieEncryptionOnAnimation.playSegments([50, 100], true); //.goToAndPlay(50);
          setTimeout(() => { 
            try {
              self.$refs.audioPlayer.play(); 
            } catch {}
            
          }, 300);
        }, 300);
        // let audio = new Audio('../assets/audio/encryption-on.mp3');   
        // audio.play();
        bgVideo.classList.add(cssName);
      } else {
        bgVideo.classList.remove(cssName);
      }
      this.toggleTheme();
      this.loadContract();
    }
  },
  computed: {
    isMobile() {
      return this.$global.isMobile();
    },

    historyItems() {
      return Array.from(this.history.values()).reverse();
    },

    contractAddress() {
      return this.enableEncryption ? appConfig.ENC_ERC20_CONTRACT : appConfig.NON_ENC_ERC20_CONTRACT;
    },
    colorScheme() {
      return {
        ButtonColor: this.enableEncryption ? "#FC4A1A" : "primary"
        //ButtonTextColor: 
      }
    },

    showProgress() {
      if (this.info === "") {
        return false
      } else if (this.info.indexOf("Error:") !== -1) {
        return false;
      }
      return true;
    },
    
    isConnected() {
      return this.account !== '';
    },

    showLowTokenWarning() {
      return this.walletBalance < 10;
    }


  },
  methods: {
    gotIt() {
      this.showEncryptionInfo = false;
      window.localStorage.setItem('alreadySawTip', '1');
    },
    openExplorer(tx: string) {
      window.open(this.explorer + '/tx/' + tx + '/raw-trace', "_blank");
    },
    shortAddress(address: string) {
      

      if (address !== undefined && address !== "") {
        return address.slice(0, 9) + '…' + address.slice(address.length - 6);
      }
      return "";
    },    
    async connect() {
      console.log(ethers);
      let accounts = await this.metamask.request({ method: 'eth_requestAccounts', params: [] });
      if (accounts && accounts.length > 0) {
        console.log(accounts);
        this.account = accounts[0];
        try {
          await this.metamask.request({ 
            method: 'wallet_switchEthereumChain', 
            params: [{ chainId: ethers.utils.hexlify(appConfig.CHAIN_ID) }] 
          });
        } catch (err) {
          await this.metamask.request({ 
            method: 'wallet_addEthereumChain', 
            params: [
            {
                chainId: ethers.utils.hexlify(appConfig.CHAIN_ID),
                chainName: 'Fhenix Network',
                rpcUrls: ['https://fhenode.fhenix.io/evm'],
                nativeCurrency: {
                  name: "FHE Token",
                  symbol: "FHE",
                  decimals: 18
                },
                blockExplorerUrls: ['https://demoexplorer.fhenix.io']
              }
            ] 
          }); 
        }
        web3Provider = new ethers.providers.Web3Provider(this.metamask)
        web3Signer = await web3Provider.getSigner();

        this.metamask.on('accountsChanged', async (accounts: any) => {
          console.log("accountsChanged");
          this.account = accounts[0];
          this.balance = await this.getTokenBalance();
          this.getWalletBalance();
        }); 


        window.localStorage.setItem('connectedBefore', '1');
        this.getWalletBalance();

        this.loadContract();
      }
    },
    hexToBytes(hex: String) {
      for (var bytes = [], c = 0; c < hex.length; c += 2) {
        bytes.push(parseInt(hex.substring(c, c + 2), 16));
      }
      return bytes;
    },

    saveHistory() {
      const obj = Object.fromEntries(this.history);
      window.localStorage.setItem('transactionHistory', JSON.stringify(obj));
    },

    loadHistory() {
      const obj = JSON.parse(window.localStorage.getItem('transactionHistory') || '{}');
      this.history = new Map(Object.entries(obj));
    },

    clearHistory() {
      this.history.clear();
      this.saveHistory();
    },

    updateStatus(tx: string, newStatus: string) {
      if (this.history.has(tx)) {
        let entry = this.history.get(tx);
        if (entry) {
          entry.status = newStatus;
          this.history.set(tx, entry);
        }
        this.saveHistory();
      }
    },


    async mintToken(amount: number) {
      if (this.activeContract !== null) {
        this.minting = true;
        try {
          var tx = null;
          if (this.enableEncryption) {
            this.info = "Minting; Encrypting amount...";
            console.log("Encrypting...");
            let mintAmount = await this.encrypt(amount);
            console.log(mintAmount);
            const encryptedAmount = this.hexToBytes(mintAmount);
            let aa = fromHexString(mintAmount);
            this.info = "Minting; Sending transaction...";
            tx = await this.activeContract.mint(encryptedAmount, { gasLimit: 10000000000 })
          } else {
            this.info = "Minting; Sending transaction...";
            tx = await this.activeContract.mint(amount); //, { gasLimit: 5000000000 }
          }

          if (tx !== null) {
            console.log(tx);
            this.history.set(tx.hash, {
              tx: tx.hash,
              encrypted: this.enableEncryption,
              status: "Pending",
              action: "Mint"
            });
            this.saveHistory();
            this.info = "Minting; Waiting for confirmation...";
            
            tx.wait().then(async (receipt) => {
              this.updateStatus(tx.hash, "Success");
              this.minting = false;
              console.log("Mint Successful!")
              console.log(receipt);
              this.balance = await this.getTokenBalance();
              this.info = "";
            }).catch((err) => {
              this.minting = false;
              this.updateStatus(tx.hash, "Failed");
              console.log("handleClick Error: ", err)
              this.info = "Error: Mint Failed!";
            });
            this.getWalletBalance();            
          }
        } catch (err) {
          this.minting = false;
          this.info = "Error: Mint failed";
          console.log(err);
        }

      }
    },

    async getWalletBalance() {
      console.log("Checking balance...")
      let balance = await web3Provider.getBalance(this.account);
      console.log("!!", balance);
      this.walletBalance = parseFloat(ethers.utils.formatEther(balance));
      console.log(this.walletBalance);
    },

    async rquestCoinsFromFaucet() {
      var self = this;
      this.usingFaucet = true;
      var myCurrentBalance = this.walletBalance;
      await this.getCoins(this.account);
      const checkBalance = async () => {
        await self.getWalletBalance();
        if (myCurrentBalance == self.walletBalance) {
          setTimeout(()=> {
            console.log("Checking balance...");
            checkBalance();
          }, 1000);
        } else {
          self.walletBalanceChecking = false;
        }
      }
      self.usingFaucet = false;
      self.walletBalanceChecking = true;
      checkBalance();
    },

    async getTokenBalance() {
      if (this.activeContract === null) {
        console.log("Please load contract");
        return;
      }
      this.loadingContract = true;
      let balance = -1;
      try {
        this.info = "Querying balance from contract..."
        if (this.enableEncryption) {
          balance = await this.getFHETokenBalance(web3Provider);
          console.log("@@@@@@@@@@", balance);
        } else {
          console.log(this.account);
          let result = await this.activeContract.balanceOf(this.account);
          balance = parseFloat(result);
        }
      } catch (err) {
        this.info = "Error: Cannot read balance (does account exist?)";
        console.error("Balance error");
        console.error(err);
      }
      this.loadingContract = false;
      this.info = "";
      if (balance > 0) {
        this.pageIdx = 1;
      } else {
        this.pageIdx = 0;
      }

      return balance;
    },

    copyToClipboard(what: string) {
      navigator.clipboard.writeText(what);
    },

    async loadContract() {
      this.loadingContract = true;
      this.info = "Loading contract...";
      this.activeContract = new ethers.Contract(this.contractAddress, (this.enableEncryption) ? ABIENC : ABI, web3Signer);
      console.log(this.activeContract);
      try {
        this.balance = await this.getTokenBalance();
      } catch (err) {}
      if (this.balance > 0) {
        this.pageIdx = 1;
      } else {
        this.pageIdx = 0;
      }
      console.log("My Balance", this.balance);
      this.loadingContract = false;
    },

    async sendTokens() {
      let recipient = this.$refs.recipient.value;
      let amount = this.$refs.amount.value;
      
      if (amount <= 0 || recipient === "") {
        return;
      }
      
      if (this.activeContract !== null) {
        try {
          this.showSend = false;
          this.transferring = true;  
          var tx = null;
          if (this.enableEncryption) {
            this.info = "Token Transfer; Encrypting amount...";
            console.log("Encrypting amount...");
            let mintAmount = await this.encrypt(amount);
            const encryptedAmount = this.hexToBytes(mintAmount);
            this.info = "Token Transfer; Sending transaction...";
            tx = await this.activeContract.transfer(recipient, encryptedAmount, { gasLimit: 10000000000 })
          } else {
            this.info = "Token Transfer; Sending transaction...";
            tx = await this.activeContract.transfer(recipient, amount); //, { gasLimit: 10000000000 })
          }
          this.info = "Token Transfer; Waiting for confirmation...";
          if (tx) {
            this.history.set(tx.hash, {
              tx: tx.hash,
              encrypted: this.enableEncryption,
              status: "Pending",
              action: "Send Tokens"
            });
            this.saveHistory();
            console.log(tx);            
            tx.wait().then(async (receipt) => {
              this.updateStatus(tx.hash, "Success");
              this.transferring = false;
              console.log("Transfer Successful!");
              console.log(receipt);
              this.info = "";
              this.balance = await this.getTokenBalance();
            }).catch((err) => {
              this.updateStatus(tx.hash, "Failed");
              this.transferring = false;
              console.log("handleClick Error: ", err)
              console.log("Transfer Failed!");
              this.info = "Transfer Failed!";
            });
          }
          this.getWalletBalance();    
        } catch (err) {
          this.transferring = false;
          this.info = "Error: Transfer failed!";
        }
      }
    },

    toggleEncryption() {
      this.enableEncryption = !this.enableEncryption;
      if (this.enableEncryption) {
        let audio = new Audio(require('~/assets/audio/encryption-on.mp3'));   
        audio.play();
      }
    },

    encryptionAnimationComplete() {
      console.log("Animation Complete!")
      this.showEncryptionAnimation = false;
    }
  }  

}