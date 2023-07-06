<script lang="ts">
import FHEMixin from '../mixins/fhe';
import mainMixin from '../mixins/mainMixin';

import { useTheme } from 'vuetify'


export default {
  mixins: [mainMixin, FHEMixin],
  setup () {
    const theme = useTheme();
    return {
      theme,
      toggleTheme: () => {
        return theme.global.name.value = theme.global.name.value === 'nonEncryptedTheme' ? 'encryptedTheme' : 'nonEncryptedTheme';
      } 
    }
  },  
  data() {
    return {
      showHistory: false
    }
  },
  computed: {
    infoBoxAnimatedStyle() {
      let bgColor = "rgba(10, 10, 10, 0.4)";
      let infoHeight = "35px";

      if (this.info !== "") {
        infoHeight = "55px";
        if (this.info.indexOf("Error:") !== -1) {
          bgColor = "rgba(200, 100, 100, 0.6)";
        }        
      }
      return { "--info-height" : infoHeight, "--bg-color": bgColor };
    },
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

  .contract-box {
    background-color: rgba(56, 56, 56, 1); 
    /* color: black;  */
    color: white;
    padding: 8px; 
    width: 330px;
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

.connect-wallet-animate::after {
  content: '';
  width: 30px; height: 30px;
  border-radius: 100%;
  border: 6px solid #ff6600;
  position: absolute;
  z-index: 0;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  animation: ring-1 1.5s infinite;
}



.button-focus-animation-enc::after {
  content: '';
  width: 30px; height: 30px;
  border-radius: 100%;
  border: 3px solid #ff6600;
  position: absolute;
  z-index: 0;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  animation: ring-1 1.5s infinite;  
}

.button-focus-animation::after {
  content: '';
  width: 30px; height: 30px;
  border-radius: 100%;
  border: 3px solid #2196F3;
  position: absolute;
  z-index: 0;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  animation: ring-1 1.5s infinite;  
}

@keyframes ring-1 {
  0% {
    width: 30px;
    height: 30px;
    opacity: 1;
  }
  /* If using 100% there is bug that blink the full circle */
  90% {
    width: 200px;
    height: 200px;
    opacity: 0;
  }
}



</style>

<template>
  <div class="main">
    
    <img class="logo" src="~/assets/fhenix_logo.svg" />
    <template  v-if="account != ''">
      <div>Account: {{ shortAddress(account) }} 
      <v-btn color="blue" density="compact" icon @click="copyToClipboard" size="small">
        <template v-slot:default>
          <v-tooltip activator="parent" location="end">Copy</v-tooltip>

         <v-icon size="x-small" icon="mdi-content-copy"></v-icon>
        </template>
      </v-btn>
    </div>
    </template>
    <div style="font-size: 12px; margin-top: -10px">My FHE wallet balance: {{  walletBalanceChecking ? "refreshing..." :  walletBalance }}</div>

    <v-btn v-if="account == ''" class="btn connect-wallet-animate" color="#FC4A1A" rounded @click="connect">
      <template v-slot:prepend>
        <div style="height: 24px; width: 24px"><img src="~/assets/metamask.logo.svg" /></div>
      </template>
      Connect
    </v-btn>

    <template v-if="account != ''">
      <div style="display: flex; flex-direction: column; align-items: center;">
        <div style="font-size: 10px">
          <v-switch
            v-model="enableEncryption"
            hide-details
            color="green"
            density="compact"
            
          >
            <template v-slot:label>
              <div style="display: flex; gap: 4px; white-space: nowrap;"><div>Encryption:</div> <div style="font-weight: bold; width: 25px" :color="enableEncryption ? 'green' : 'red'">{{enableEncryption ? 'On' : 'Off'}}</div></div>
            </template>            
          </v-switch>
        </div>  
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

      
        <div class="contract-box">Contract: {{  shortAddress(contractAddress) }}</div>
        <div class="info-box" :style="infoBoxAnimatedStyle" >
          <div>
            <div style="margin-bottom: 0px;">balance: {{  balance !== -1 ? balance : "unknown"  }} {{ enableEncryption ? 'FHET' : 'TKN' }}</div>
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

      <div v-if="isConnected && walletBalance < 50" style="text-align: center">
        <div><v-btn class="btn" :class="showLowTokenWarning && !(usingFaucet || walletBalanceChecking) ? 'button-focus-animation' : ''" :loading="usingFaucet || walletBalanceChecking" color="#FC4A1A" rounded @click="rquestCoinsFromFaucet()" :disabled="account === '' || usingFaucet || walletBalanceChecking || walletBalance > 50" style="margin-top: 10px">Get Coins</v-btn></div>
        <div style="font-size: 12px; margin-top: 0px">Get some coins to interact with the chain</div>
      </div>

      <div v-if="walletBalance > 0" style="display: flex; gap: 10px; margin-top: 20px">
        <v-btn :disabled="balance < 1 || showLowTokenWarning || transferring || minting" :loading="transferring" color="primary" rounded style="" @click="showSend = true">
          Send
        </v-btn>
        <v-btn :class="balance < 1 ? (enableEncryption ? 'button-focus-animation-enc' : 'button-focus-animation') : ''" :disabled="showLowTokenWarning || minting || transferring" :loading="minting" color="primary" rounded style="" @click="mintToken(10)">Mint 10 Tokens</v-btn>
      </div>
      <div v-if="activeContract === null" style="font-size: 12px; margin-top: -5px">Please load contract to interact with it</div>
      
    </template>
    
    <div v-if="isConnected" style="position: absolute; bottom: 30px">
      <v-btn @click="showHistory = true" color="primary" rounded>Show UI Activity</v-btn>      
      <swipe-modal
        v-model="showHistory"
        contents-height="50vh"
        border-top-radius="16px"
        dark="true"
      >
      <div style="width: 100%; text-align: right">
        <div style="margin-right: 20px"> 
          Clear Activity <v-btn :disabled="historyItems.length === 0" @click="clearHistory" density="compact" icon="mdi-delete"></v-btn>
        </div>
      </div>
      <div style="height: 1px; width: 100%; background-color: white; opacity: 0.5; margin-top: 5px; margin-bottom: 5px"></div>
      <v-list style="width: 100%; background: none; color: white">
        <v-list-item
          v-for="(item, i) in historyItems"
          :key="i"
          :value="item"
          color="primary"
        >
          <template v-slot:prepend>
            <v-tooltip activator="parent" location="start">{{ item.encrypted ? "Encrypted" : "Not Encrypted"}}</v-tooltip>
            <v-icon :icon="item.encrypted ? 'mdi-lock' : 'mdi-lock-open'"></v-icon>
          </template>
          <template v-slot:append>
            <v-btn icon="mdi-open-in-new" density="compact" @click="openExplorer(item.tx)" ></v-btn>
          </template>
          <v-list-item-title>{{ shortAddress(item.tx) }}</v-list-item-title>
          <v-list-item-subtitle>Action: {{ item.action }}</v-list-item-subtitle>
          <v-list-item-subtitle>Status: {{ item.status }}</v-list-item-subtitle>
        </v-list-item>
      </v-list>
      </swipe-modal>
    </div>    

    <swipe-modal
        v-model="showSend"
        contents-height="50vh"
        border-top-radius="16px"
        dark="true"
      >
      <v-card density="compact" elevation="0" color="transparent" >
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
      </swipe-modal>
  </div>
</template>