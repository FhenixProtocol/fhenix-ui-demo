<script lang="ts">
import MetaMaskSDK from '@metamask/sdk';
import FHEMixin from '../mixins/fhe';
//import Web3 from 'web3'
import { ethers } from "ethers";


import ABI from '../assets/erc20.json';
import appConfig from '../config/appConfig.json'

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
      account: "",
      balance: -1,
      contractAddress: appConfig.ERC20_CONTRACT,
      recipientAddress: "",
      activeContract: null,
      loadingContract: false,
      minting: false,
      info: ""
    }
  }, 
  computed: {
    shortAddress() {
      if (this.account != "") {
        return this.account.slice(0, 9) + '…' + this.account.slice(this.account.length - 6);
      }
      return "";
    }
  },
  methods: {
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
                chainName: 'Phenix Network',
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
        web3Provider = new ethers.providers.Web3Provider(window.ethereum)
        web3Signer = await web3Provider.getSigner();
        window.localStorage.setItem('connectedBefore', '1')
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
          
          tx.wait().then((receipt) => {
            this.minting = false;
            console.log("Transfer Successful!")
            console.log(receipt);
            this.info = "";
          }).catch((err) => {
            this.minting = false;
            console.log("handleClick Error: ", err)
            console.log("Transfer Failed!");
            this.info = "";
          });
        } catch (err) {
          this.minting = false;
          console.log(err);
        }
      }
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
        console.log("1111")     
        let encBalance = await this.activeContract.balanceOf();
        console.log("2222");
        this.info = "Decrypting balance..."
        balance = await this.decrypt(encBalance.slice(2));
        this.info = ""
      } catch (err) {
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
      this.activeContract = new ethers.Contract(this.contractAddress, ABI, web3Signer);
      this.balance = await this.getTokenBalance();
      console.log("My Balance", this.balance);
      this.loadingContract = false;
      this.info = "";      
    }


  }
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

  .info-box {
    position: relative;
    width: 300px; 
    height: 40px; 
    background-color: gray; 
    margin-top: -40px; 
    border-radius: 0px 0px 15px 15px;    
    background-color: rgba(100, 100, 100, 0.6);
    backdrop-filter: blur(7px);
    z-index: -1;
    line-height: 45px;
    padding-left: 10px;
    font-size: 12px
  }

</style>

<template>
  <div class="main">
    <img class="logo" src="~/assets/fhenix_logo.svg" />
    <div v-if="account != ''">Account: {{ shortAddress }} 
      <v-btn color="blue" density="compact" icon @click="copyToClipboard" size="small">
        <template v-slot:default>
          <v-tooltip activator="parent" location="end">Copy</v-tooltip>

         <v-icon size="x-small" icon="mdi-content-copy"></v-icon>
        </template>
      </v-btn>
    </div>
    <v-btn v-if="account == ''" class="btn" color="#FC4A1A" rounded @click="connect">
      <template v-slot:prepend>
        <div style="height: 24px; width: 24px"><img src="~/assets/metamask.logo.svg" /></div>
      </template>
      Connect
    </v-btn>

    <template v-if="account != ''">
      <div style="margin-bottom: -10px;">balance: {{  balance !== -1 ? balance : "unknown"  }}</div>
      <v-text-field density="compact" rounded variant="solo" label="Contract Address" style="width: 350px;" v-model="contractAddress" >
        <template v-slot:prepend-inner>
          <div style="height: 24px; width: 24px"><img src="~/assets/smart_contract.png" /></div>
        </template>
        <template v-slot:append-inner>
          <v-btn density="compact" style="font-size: 12px" color="#FC4A1A" rounded @click="loadContract">{{ loadingContract ? "Wait..." : "Load"}}</v-btn>
        </template>
      </v-text-field>
      <div class="info-box">
        {{ info }}
        <div v-if="info !== ''" style="position: absolute; left: 15px; bottom: 0px; width: calc(100% - 30px); height: 3px">
          <v-progress-linear style="width: 100%; height: 3px"
          indeterminate
          color="orange-darken-2"
          ></v-progress-linear>

        </div>

      </div>
      <v-btn class="btn" color="#FC4A1A" rounded @click="mintToken(123)" :disabled="activeContract === null || loadingContract || minting">
        <template v-slot:prepend>
          <div style="height: 24px; width: 24px"><img src="~/assets/metamask.logo.svg" /></div>
        </template>
        Mint 123 Tokens
      </v-btn>      
    </template>
  </div>
</template>