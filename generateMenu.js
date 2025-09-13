const fs = require("fs");
const { v4: uuidv4 } = require("uuid");

const filePath = "./public/data/menu.json"; // json ka path

// file read karo
let data = JSON.parse(fs.readFileSync(filePath, "utf8"));

// har item ko unique id do (agar nahi hai to)
data = data.map(item => {
  if (!item.id) {
    item.id = uuidv4();
  }
  return item;
});

// file dobara save karo
fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");

console.log("✅ Menu.json updated with unique IDs!");
