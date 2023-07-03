<script lang="ts">
import MetaMaskSDK from '@metamask/sdk';
import FHEMixin from '../mixins/fhe';
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

export default {
  mixins: [FHEMixin],    
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

  },
  data() {
    return {
      mmsdk: null,
      metamask: null,
      enableEncryption: false,
      encryptionOn: encryptionOn,
      showEncryptionAnimation: false,
      account: "",
      balance: -1,
      walletBalance: 0,
      walletBalanceChecking: false,
      contractAddress: appConfig.ENC_ERC20_CONTRACT,
      recipientAddress: "",
      activeContract: null,
      loadingContract: false,
      minting: false,
      info: "", 
      showSend: false,
      transferring: false,
      amountRules: [
        value => {
          if (value) return true

          return 'Amount is requred.'
        },
        value => {
          if (value > 0) return true

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


    }
  }, 
  watch: {
    enableEncryption(state) {
      var self = this;
      this.showEncryptionAnimation = true;
      if (state === true) {
        setTimeout(() => {
          self.$refs.lottieEncryptionOnAnimation.playSegments([50, 100], true); //.goToAndPlay(50);
          setTimeout(() => { self.$refs.audioPlayer.play(); }, 300);
        }, 300);
        // let audio = new Audio('../assets/audio/encryption-on.mp3');   
        // audio.play();
      }
    }
  },
  computed: {
    infoBoxAnimatedStyle() {
      let bgColor = "rgba(10, 10, 10, 0.4)";
      let infoHeight = "35px";

      if (this.info !== "") {
        infoHeight = "60px";
        if (this.info.indexOf("Error:") !== -1) {
          bgColor = "rgba(200, 100, 100, 0.6)";
        }        
      }
      return { "--info-height" : infoHeight, "--bg-color": bgColor };
    },
    showProgress() {
      if (this.info === "") {
        return false
      } else if (this.info.indexOf("Error:") !== -1) {
        return false;
      }
      return true;
    }
  },
  methods: {
    shortAddress(address: string) {
      if (address != "") {
        return address.slice(0, 9) + '…' + address.slice(address.length - 6);
      }
      return "";
    },    
    async connect() {
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
                }
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
      }
    },
    hexToBytes(hex: String) {
      for (var bytes = [], c = 0; c < hex.length; c += 2) {
        bytes.push(parseInt(hex.substring(c, c + 2), 16));
      }
      return bytes;
    },


    async mintToken(amount: number) {
      console.log("Minting...");
      if (this.activeContract !== null) {
        try {
          this.minting = true;  
          this.info = "Minting; Encrypting amount...";
          console.log("Encrypting...");
          let mintAmount = await this.encrypt(amount);
          const encryptedAmount = this.hexToBytes(mintAmount);
          this.info = "Minting; Sending transaction...";
          let tx = await this.activeContract.mint(encryptedAmount, { gasLimit: 10000000000 })
          console.log(tx);

          this.info = "Minting; Waiting for confirmation...";
          
          tx.wait().then(async (receipt) => {
            this.minting = false;
            console.log("Mint Successful!")
            console.log(receipt);
            this.balance = await this.getTokenBalance();
            this.info = "";
          }).catch((err) => {
            this.minting = false;
            console.log("handleClick Error: ", err)
            this.info = "Error: Mint Failed!";
          });
          this.getWalletBalance();          
        } catch (err) {
          this.minting = false;
          this.info = "Error: Mint failed";
          console.log(err);
        }
      }
    },

    async getWalletBalance() {
      let balance = await web3Provider.getBalance(this.account);
      this.walletBalance = ethers.utils.formatEther(balance);
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
        let encBalance = await this.activeContract.balanceOf();
        console.log(typeof encBalance);
        console.log(encBalance);
        this.info = "Decrypting balance..."
        balance = await this.decrypt(encBalance.slice(2));
        this.info = ""
      } catch (err) {
        this.info = "Error: Cannot read balance (does account exist?)";
        console.error("Balance error");
        console.error(err);
      }
      this.loadingContract = false;
      return balance;
    },

    copyToClipboard() {
      navigator.clipboard.writeText(this.account);      
    },

    async loadContract() {
      this.loadingContract = true;
      this.info = "Loading contract...";
      this.activeContract = new ethers.Contract(this.contractAddress, ABIENC, web3Signer);
      this.balance = await this.getTokenBalance();
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
          this.info = "Token Transfer; Encrypting amount...";
          console.log("Encrypting amount...");
          let mintAmount = await this.encrypt(amount);
          const encryptedAmount = this.hexToBytes(mintAmount);
          this.info = "Token Transfer; Sending transaction...";
          let tx = await this.activeContract.transfer(recipient, encryptedAmount, { gasLimit: 10000000000 })
          console.log(tx);

          this.info = "Token Transfer; Waiting for confirmation...";
          
          tx.wait().then(async (receipt) => {
            this.transferring = false;
            console.log("Transfer Successful!");
            console.log(receipt);
            this.info = "";
            this.balance = await this.getTokenBalance();
          }).catch((err) => {
            this.transferring = false;
            console.log("handleClick Error: ", err)
            console.log("Transfer Failed!");
            this.info = "Transfer Failed!";
          });
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
  },


}
</script>

<style scoped>
  .main {
    color: white;
    display: flex; 
    flex-direction: column; 
    align-items: center;
    padding: 10px;
    gap: 10px;
  }

  .logo {
    height: 70px;
    margin-bottom: 20px;
  }

  .btn {
    width: auto;
    color: white    
  }

  .contract-box {
    background-color: white; 
    color: black; 
    padding: 6px; 
    border-radius: 8px;  
    z-index: 2;
    box-shadow: inset 0 0 1px black;
  }

  .info-box {
    position: relative;
    width: 300px; 
    height: var(--info-height); 
    margin-top: -7px; 
    border-radius: 0px 0px 15px 15px;    
    background-color: var(--bg-color);
    backdrop-filter: blur(7px);
    z-index: 1;
    /* line-height: 45px; */
    padding-top: 12px;
    padding-left: 10px;
    font-size: 12px;
    transition-property: height;
    transition-timing-function: cubic-bezier(0.47, 1.64, 0.41, 0.8);
    transition-duration: 0.3s;
  }

  .lock-container {
    position: absolute; 
    top: 200px; 
    z-index: 90; 
    width: 300px; 
    height: 300px; 
    backdrop-filter: blur(10px);
    background-color: rgba(0, 0, 0, 0.3);
    border-radius: 50%; 
    display: flex; 
    justify-content: center; 
    align-items: center;
  }

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.5s;
}

.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

.fade-enter-to, .fade-leave-from {
  opacity: 1;
}


</style>

<template>
  <div class="main">
    Mobile
    <img class="logo" src="~/assets/fhenix_logo.svg" />
    <template  v-if="account != ''">
      <on-off-switch label="Encryption:" v-model="enableEncryption"></on-off-switch>
      <transition name="fade">
        <div class="lock-container" v-if="enableEncryption && showEncryptionAnimation">
          <audio ref="audioPlayer" :src="audioSource" />
          <Vue3Lottie
            ref="lottieEncryptionOnAnimation"
            :animationData="encryptionOn"
            :loop="false"
            @onComplete="encryptionAnimationComplete"
          />
        </div>
      </transition>
      <div>Account: {{ shortAddress(account) }} 
      <v-btn color="blue" density="compact" icon @click="copyToClipboard" size="small">
        <template v-slot:default>
          <v-tooltip activator="parent" location="end">Copy</v-tooltip>

         <v-icon size="x-small" icon="mdi-content-copy"></v-icon>
        </template>
      </v-btn>
    </div>

    </template>

    <v-btn v-if="account == ''" class="btn" color="#FC4A1A" rounded @click="connect">
      <template v-slot:prepend>
        <div style="height: 24px; width: 24px"><img src="~/assets/metamask.logo.svg" /></div>
      </template>
      Connect
    </v-btn>

    <template v-if="account != ''">
      <div style="display: flex; flex-direction: column; align-items: center;">
        <div class="contract-box">{{  contractAddress }}</div>
        <div class="info-box" :style="infoBoxAnimatedStyle" >
          <div>
            <div style="margin-bottom: 0px;">balance: {{  balance !== -1 ? balance : "unknown"  }}</div>
            {{ info }}
          </div>
          <div v-if="showProgress" style="position: absolute; left: 15px; bottom: 0px; width: calc(100% - 30px); height: 3px">
            <v-progress-linear style="width: 100%; height: 3px"
            indeterminate
            color="orange-darken-2"
            ></v-progress-linear>
          </div>
        </div>        
      </div>
      
      <!-- <v-text-field density="compact" rounded variant="solo" label="Contract Address" style="width: 350px; z-index: 2" v-model="contractAddress" >
        <template v-slot:prepend-inner>
          <div style="height: 24px; width: 24px"><img src="~/assets/smart_contract.png" /></div>
        </template>
        <template v-slot:append-inner>
          <v-btn density="compact" style="font-size: 12px" color="#FC4A1A" rounded @click="loadContract">{{ loadingContract ? "Wait..." : "Load"}}</v-btn>
        </template>
      </v-text-field> -->


      <div style="display: flex; gap: 10px">
        <v-btn class="btn" color="#FC4A1A" rounded @click="showSend = true" :disabled="activeContract === null || loadingContract || minting || transferring" style="margin-top: 10px">
          Transfer
        </v-btn>      

        <v-btn class="btn" color="#FC4A1A" rounded @click="mintToken(123)" :disabled="activeContract === null || loadingContract || minting || transferring" style="margin-top: 10px">
          Mint
        </v-btn>      
      </div>
      <div v-if="activeContract === null" style="font-size: 12px; margin-top: -5px">Please load contract to interact with it</div>
      <div>
        <v-btn class="btn" color="#FC4A1A" rounded @click="rquestCoinsFromFaucet()" :disabled="account === '' || usingFaucet" style="margin-top: 10px">
          {{ usingFaucet ? "Please wait..." : "Get Coins from faucet" }} 
        </v-btn>
      </div>
      <div style="font-size: 12px; margin-top: -10px">My FHE wallet balance: {{  walletBalanceChecking ? "refreshing..." :  walletBalance }}</div>
    </template>

    <v-dialog v-model="showSend" width="400" persistent>
      <v-card density="compact">
        <v-card-title>
          <span class="text-h6">Token Transfer</span>
        </v-card-title>
        <v-card-text>
          <v-container fluid>
            <v-row>
              <v-col
                cols="12"
                sm="12"
              >
                <v-text-field
                  label="Send To"
                  required
                  density="compact"
                  ref="recipient"
                  :rules="recipientRules"
                ></v-text-field>
                <v-text-field
                  label="Amount"
                  required
                  density="compact"
                  type="number"
                  ref="amount"
                  :rules="amountRules"                  
                ></v-text-field>
              </v-col>
            </v-row>
          </v-container>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
            color="blue-darken-1"
            variant="text"
            @click="showSend = false"
          >
            Close
          </v-btn>
          <v-btn
            color="blue-darken-1"
            variant="text"
            @click="sendTokens()"
          >
            Send
          </v-btn>
        </v-card-actions>

      </v-card>
    </v-dialog>     
  </div>
</template>