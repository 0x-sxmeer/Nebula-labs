# MegaRouter Deployment Guide

This guide explains how to deploy your `MegaRouter.sol` smart contract to a blockchain (Ethereum, Polygon, Arbitrum, etc.) using **Remix IDE**. This is the easiest method and requires no additional software installation.

## Prerequisites

1.  **Metamask Installed**: Ensure you have the Metamask extension in your browser.
2.  **Funds**: You need a small amount of native token (ETH, MATIC, BNB) on the network you want to deploy to (for gas fees).

## Step 1: Open Remix IDE

1.  Go to [https://remix.ethereum.org/](https://remix.ethereum.org/).
2.  In the "File Explorer" (left sidebar), click the **"Create New Convertible"** (file icon) or just right-click "contracts" folder -> **New File**.
3.  Name it `MegaRouter.sol`.

## Step 2: Copy the Code

1.  Open the `contracts/MegaRouter.sol` file in your local project.
2.  Copy the **entire content** (starts with `// SPDX-License-Identifier...`).
3.  Paste it into the new `MegaRouter.sol` file you created in Remix.

## Step 3: Compile

1.  Click the **"Solidity Compiler"** icon in the left sidebar (looks like an "S").
2.  Ensure "Compiler" is set to version `0.8.20` (or newer).
3.  Click the blue **"Compile MegaRouter.sol"** button.
    - _If you see a green checkmark on the sidebar icon, compilation was successful._

## Step 4: Deploy

1.  Click the **"Deploy & Run Transactions"** icon (looks like an Ethereum logo with an arrow).
2.  **Environment**: Select **"Injected Provider - MetaMask"** from the dropdown.
    - _Metamask will pop up asking to connect. Approve it._
    - _Make sure your Metamask is on the network you want to deploy to (e.g., Polygon Mainnet)._
3.  **Contract**: Ensure "MegaRouter" is selected in the dropdown.
4.  Click the orange **"Deploy"** button.
5.  **Confirm the transaction** in Metamask.
    - _Wait for the transaction to be confirmed (mined)._

## Step 5: Get the Address

1.  Once confirmed, look at the **"Deployed Contracts"** section at the bottom of the left sidebar.
2.  Expand the `MegaRouter` entry.
3.  Click the **"Copy"** icon next to the contract name/address (`0x...`).

## Step 6: Connect to DApp

1.  Go back to your local project code.
2.  Open `src/hooks/useSwap.js`.
3.  Locate the line (approx line 43):
    ```javascript
    const MEGA_ROUTER_ADDRESS = "0x0000000000000000000000000000000000000000";
    ```
4.  Paste your new address inside the quotes:
    ```javascript
    const MEGA_ROUTER_ADDRESS = "0xYourCopiedAddressHere...";
    ```
5.  Running `npm run dev`? The app will auto-reload, and Multi-Route Execution is now active!
