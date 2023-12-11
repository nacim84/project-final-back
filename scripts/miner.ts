import { mine } from "@nomicfoundation/hardhat-network-helpers";

async function main() {
 console.log("Mining...");
 await mine();
};

main();