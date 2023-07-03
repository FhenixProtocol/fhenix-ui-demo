
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

import { useTheme } from 'vuetify'

// They should be non-reactive variables
var web3Provider;
var web3Signer;

const fromHexString = (hexString: string): Uint8Array => {
  const arr = hexString.replace(/^(0x)/, '').match(/.{1,2}/g);
  if (!arr) return new Uint8Array();
  return Uint8Array.from(arr.map((byte) => parseInt(byte, 16)));
};

interface TransactionHistoryEntry {
    encrypted: boolean;
    status: string;
}


export default {
  mixins: [FHEMixin],
  setup () {
    const theme = useTheme();
    return {
      theme,
      toggleTheme: () => {
        return theme.global.name.value = theme.global.name.value === 'nonEncryptedTheme' ? 'encryptedTheme' : 'nonEncryptedTheme';
      } 
    }
  },
  
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
        bgVideo.classList.add("enc-bg");
      } else {
        bgVideo.classList.remove("enc-bg");
      }
      this.toggleTheme();
      this.loadContract();
    }
  },
  computed: {
    historyItems() {
      return Array.from(this.history.values());
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

    infoBoxAnimatedStyle() {
      let bgColor = "rgba(10, 10, 10, 0.4)";
      let infoHeight = "35px";

      if (this.info !== "") {
        infoHeight = "35px";
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
    },
    
    isConnected() {
      return this.account !== '';
    },

    showLowTokenWarning() {
      return this.walletBalance < 10;
    }


  },
  methods: {
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
  },


}
</script>

<template>
  <div class="main">
    <div class="settings-panel">
      <div id="logo" style="position: absolute; padding: 10px; left:3px; height: 100px; width: 320px">
        <img class="logo" src="~/assets/fhenix_logo.svg" />
      </div>
      
      <div style="height: 120px;"></div> <!-- spacer -->
      
      <v-btn class="btn connect-wallet" :class="isConnected ? 'connected-wallet' : 'connect-wallet-animate'" color="#FC4A1A" rounded @click="connect">
        <template v-slot:prepend>
          <div style="height: 24px; width: 24px"><img src="~/assets/metamask.logo.svg" /></div>
        </template>
        {{ isConnected ? "Connected" : "Connect Wallet" }}
      </v-btn>

      <div style="height: 30px;"></div> <!-- spacer -->

      <div v-if="isConnected" class="account-info">
        <div>Account: <span style="font-family: monospace">{{ shortAddress(account) }}</span></div>
        <div style="margin-bottom: 0px;">Balance: <span style="font-family: monospace; color: #FC4A1A; font-weight: bold">{{  walletBalanceChecking ? "refreshing..." :  walletBalance.toFixed() }}</span> <span v-if="!walletBalanceChecking" style="font-family: monospace">FHE</span></div>
        <v-btn class="btn" :class="showLowTokenWarning && !(usingFaucet || walletBalanceChecking) ? 'button-focus-animation' : ''" :loading="usingFaucet || walletBalanceChecking" color="#FC4A1A" rounded @click="rquestCoinsFromFaucet()" :disabled="account === '' || usingFaucet || walletBalanceChecking || walletBalance > 1100" style="margin-top: 10px">
          <template v-slot:default>
            <!-- <v-tooltip activator="parent" location="bottom">Get coins from the faucet if you to allow execute transactions</v-tooltip> -->
            Get coins
          </template>
        </v-btn>
        <div v-if="showLowTokenWarning" style="font-size: 11px">You need more coins to make transactions</div>

      </div>
        
    </div>
    <div class="content-panel">
      <div v-if="!isConnected" class="content-blocker">
        
        <!-- <div style="margin-left: 30px;  padding: 20px; background-color: rgba(255, 255, 255, 0.171); max-width: 400px; border-radius: 15px;">
          <div style="text-shadow: 1px 1px 2px black; font-size: 28px; font-weight: bold; color: #ffe600;">Please connect your wallet</div>
        </div> -->
       
      </div>
      <!-- <div style="display: flex; flex-direction: column">
      </div> -->
      <div>
        <div class="action-panel" :class="enableEncryption ? 'encrypted' : 'non-encrypted'">
          <div style="font-size: 24px; display: flex; align-items: center; gap: 10px">
            <b>Contract:</b> <span style="font-family: monospace">{{ shortAddress(contractAddress) }}</span> 
            <v-btn color="primary" density="compact" icon @click="copyToClipboard(contractAddress)" size="small">
              <template v-slot:default>
                <v-tooltip activator="parent" location="end">Copy</v-tooltip>

              <v-icon size="x-small" icon="mdi-content-copy"></v-icon>
              </template>
            </v-btn>
            
            <div style="flex-grow: 1"></div>

            <div style="font-size: 10px">
              <v-switch
                v-model="enableEncryption"
                hide-details
                color="green"
                density="compact"
                
              >
                <template v-slot:label>
                  <div style="display: flex; gap: 4px"><div>Encryption:</div> <div style="font-weight: bold; width: 25px" :color="enableEncryption ? 'green' : 'red'">{{enableEncryption ? 'On' : 'Off'}}</div></div>
                </template>            
              </v-switch>
            </div>
            
          </div>
          <div style="width: 100%; height: 1px; background-color: rgba(255, 255, 255, 0.171);"></div>
        
          <div style="margin-top: 10px; width: 100%; flex-grow: 1; position: relative; overflow: hidden;">
            <div>Contract Balance: {{ balance }} FHET</div>
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
            <v-carousel v-model="pageIdx" style="height: 100%" hide-delimiters :show-arrows="false">
              <v-carousel-item>
                <div class="page">
                  <div style="line-height: 30px">
                    <template v-if="parseFloat(balance) < 0.1">
                      Oops... it looks like you don't have tokens in the contract.<br/>
                      You should mint some tokens or request someone to send you some.
                    </template>
                    <template v-else>
                      Mint some tokens to continue
                    </template>

                  </div>
                  <div class="empty-wallet-image"><img src="~/assets/empty-wallet.webp" style="width: 150px"/></div>
                  <v-btn :disabled="showLowTokenWarning || minting" :loading="minting" color="primary" rounded style="position: absolute; bottom: 10px; right: 10px" @click="mintToken(10)">Mint 10 Tokens</v-btn>
                </div>  

              </v-carousel-item>
              <v-carousel-item>
                <div class="page">
                  <div style="line-height: 30px">
                    <div style="font-weight: bold; font-size: 16px">Send Tokens:</div>
                    <div style="display: flex; gap: 10px">
                      <v-text-field ref="recipient" style="flex-grow: 2;" density="compact" label="Send To"></v-text-field>
                      <v-text-field ref="amount" variant="filled" style="flex-grow: 1;" density="compact" label="Amount"></v-text-field>
                    </div>
                  </div>
                  <v-btn :disabled="transferring" :loading="transferring" color="primary" rounded style="position: absolute; bottom: 10px; right: 10px" @click="sendTokens()">
                    Send
                  </v-btn>
                </div>
              </v-carousel-item>            
            </v-carousel>
          </div>
        </div>
        <v-expand-transition>
          <div class="info-box" v-show="info !== ''" :style="infoBoxAnimatedStyle" >
            <div>
              {{ info }}
            </div>
            <div v-if="showProgress" style="position: absolute; left: 15px; bottom: 0px; width: calc(100% - 30px); height: 3px">
              <v-progress-linear style="width: 100%; height: 3px"
              indeterminate
              color="orange-darken-2"
              ></v-progress-linear>
            </div>
          </div>        
        </v-expand-transition>
      </div>
      <div style="display: flex; flex-direction: column; align-items: center; gap: 10px; margin-top: 100px; margin-left: 10px; max-height: 600px; overflow-y: auto">
        <div>Transaction History</div>
        <table class="data-table" cellpadding="2" cellspacing="2">
          <thead>
            <tr>
              <th>Tx</th>
              <th>Action</th>
              <th>Encrypted</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in historyItems" :key="item.tx">
              <td><a style="color: cyan" target="_" :href="explorer + '/tx/' + item.tx + '/raw-trace'">{{ shortAddress(item.tx) }}</a></td>
              <td>{{ item.action }}</td>
              <td>{{ item.encrypted }}</td>
              <td>{{ item.status }}</td>
            </tr>
          </tbody>
        </table>
        <v-btn color="primary" rounded v-if="historyItems.length > 0" @click="clearHistory">Clear History</v-btn>
      </div>
    </div>
  </div>
</template>


<style scoped>

  .main {
    width: 100vw;
    color: white;
    display: flex; 
    flex-direction: row; 
    justify-content: flex-start;
  }

  .settings-panel {
    min-width: 280px;
    height: 100vh;
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;

    background-image: linear-gradient(
      to bottom, 
      rgba(0, 0, 0, 0.0),
      rgba(10, 10, 10, 0.3)
    );
    backdrop-filter: blur(7px);
    border-right-width: 2px;    
    border-image: 
    linear-gradient(
      to bottom, 
      rgba(0, 0, 0, 0.0) 100px,
      #FF5C00
    ) 0 100%;

  }

  .content-blocker {
    position: absolute; 
    top: 90px;
    width: 100%; 
    height: 100%; 
    /* background-color: rgba(0, 0, 0, 0.5);  */
    background: linear-gradient(0deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.1) 80%, rgba(0,0,0,0.0) 100%);


    z-index: 99; 
    backdrop-filter: blur(7px);
  }

  .content-panel {
    display: flex; 
    width: 100%;
    height: 100vh;
  }  

  .logo {
    height: 70px;
    margin-bottom: 20px;
    z-index: 100;
  }


  .btn {
    width: auto;
    color: white    
  }

  .connect-wallet {
    max-width: 200px;
  }



.connect-wallet-animate::after {
  content: '';
  width: 30px; height: 30px;
  border-radius: 100%;
  border: 6px solid #ff6600;
  position: absolute;
  z-index: -1;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  animation: ring-1 1.5s infinite;
}

.button-focus-animation::after {
  content: '';
  width: 30px; height: 30px;
  border-radius: 100%;
  border: 3px solid #ff6600;
  position: absolute;
  z-index: -1;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  animation: ring-2 1.5s infinite;  
}

@keyframes ring-1 {
  0% {
    width: 30px;
    height: 30px;
    opacity: 1;
  }
  100% {
    width: 200px;
    height: 200px;
    opacity: 0;
  }
}

@keyframes ring-2 {
  0% {
    width: 30px;
    height: 30px;
    opacity: 1;
  }
  100% {
    width: 100px;
    height: 100px;
    opacity: 0;
  }
}

  .connected-wallet {
    margin-left: -30px;
  }

  .action-panel {
    margin-left: 20px;
    margin-top: 100px;
    padding: 10px;
    width: 600px; 
    height: 300px;
    border-radius: 15px;
    
    backdrop-filter: blur(7px);

    border: 1px solid rgba(255, 255, 255, 0.274);
    
    display: flex;
    flex-direction: column;
    justify-content: stretch;
    align-items: stretch;
  }

  .action-panel.non-encrypted {
    background-color: rgba(0, 37, 61, 0.13);
  }

  .action-panel.encrypted {
    background-color: rgba(61, 24, 0, 0.13);
  }

  .account-info {

      border-radius: 15px; 
      padding: 10px; 
      width: 95%;

      /* border: 2px solid white;  */
      border-left-width: 1px;
      border-right-width: 1px;
      border-image: 
      linear-gradient(
        to top, 
        rgba(0, 0, 0, 0.0) ,
        rgba(255, 255, 255, 0.5),
        rgba(0, 0, 0, 0.0) 
      ) 0 100%;
  }

  .empty-wallet-image {
    position: absolute; 
    left: 10px; 
    bottom: 10px;  
    z-index: -1;   
    -webkit-mask-image: -webkit-gradient(linear, right bottom, left top, from(rgba(0,0,0,0.2)), to(rgba(0,0,0,0)));    
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
    margin-left: 20px;
    width: 600px; 
    height: var(--info-height); 
    margin-top: -7px; 
    border-radius: 0px 0px 15px 15px;    
    background-color: var(--bg-color);
    backdrop-filter: blur(7px);
    z-index: -1;
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
  z-index: 90; 
  width: 200px; 
  height: 200px; 
  background-color: rgba(0, 0, 0, 0.8);
  border-radius: 50%; 
  display: flex; 
  justify-content: center; 
  align-items: center;
  backdrop-filter: blur(7px);

  left: 50%; 
  top: 50%; 
  transform: translate(-50%, -50%);
}

.pages {
  display: flex;
	width: 200%;
  height: 100%;   
	/* box-sizing: border-box;	   */
}

.page {
  width: 100%; 
  height: calc(100% - 20px); 
  
  display: flex; 
  flex-direction: column; 
  position: relative; 
  padding-top: 10px;
  transition: all 0.7s;
}

.data-table {
  background-color: rgba(0, 0, 0, 0.075);
  border-collapse: separate;
  border-spacing: 2px; /* Adjust as needed */
  backdrop-filter: blur(7px);
  min-width: 450px; 
}

.data-table th {
  padding: 5px;
  background-color: #FC4A1A;
  text-align: left;
}

.data-table td {
  padding: 5px;
  background-color: rgba(128, 128, 128, 0.164);
}



</style>
