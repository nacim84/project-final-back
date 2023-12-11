import hre from "hardhat";

const main = async () => {
 const ResolutionsVoting = await hre.ethers.getContractFactory("ResolutionsVoting");
 const resolutionsVoting = await ResolutionsVoting.deploy();

 console.log(`Contract deployed with success, address : ${await resolutionsVoting.getAddress()}`);
}

const runMain = async () => {
 try {
  await main();
  process.exit(0);
 } catch (error) {
  console.error(error);
  process.exit(1);
 }
};

runMain();