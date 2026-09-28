let currentCoffee = "None";
let currentPrice = 0;

let orderQueue = [];
let actionStack = [];
let salesHistory = [];

let inventory = {
    water: 1200,
    milk: 700,
    coffee: 300
};

let recipes = {
    Espresso: {
        water: 50,
        milk: 0,
        coffee: 18
    },
    Latte: {
        water: 30,
        milk: 100,
        coffee: 18
    },
    Cappuccino: {
        water: 30,
        milk: 120,
        coffee: 18
    },
    Americano: {
        water: 100,
        milk: 0,
        coffee: 18
    },
    Mocha: {
        water: 30,
        milk: 100,
        coffee: 20
    }
};

function calculateTotalRevenue() {
    return salesHistory.reduce((total,sale) => total + sale.price , 0);
}

function updateDisplay() {
    document.getElementById("selected-coffee").textContent = "Selected Coffee: " + currentCoffee;
    document.getElementById("selected-price").textContent = "Price: ₹" + currentPrice;
    document.getElementById("queue-count").textContent = "Orders in Queue: "+orderQueue.length;

    if (orderQueue.length === 0) {
        document.getElementById("next-queue").textContent = "Next in Queue: None";
    } else {
        document.getElementById("next-queue").textContent = "Next in Queue: " + orderQueue[0].coffee;
    };

    document.getElementById("sales-count").textContent = "Total Sales: "+salesHistory.length;
    document.getElementById("total-revenue").textContent = "Total Revenue: ₹"+calculateTotalRevenue(); 
    if(salesHistory.length===0){
        document.getElementById("last-sale").textContent="Last Sale: None";
    }else{
        document.getElementById("last-sale").textContent="Last Sale: "+salesHistory[salesHistory.length-1].coffee;
    };

    document.getElementById("water-stock").textContent = "Water: "+inventory.water+"ml";
    document.getElementById("milk-stock").textContent = "Milk: "+inventory.milk+"ml";
    document.getElementById("coffee-stock").textContent = "Coffee: "+inventory.coffee+'g';
}

function setStatus(message , color) {
    const status = document.getElementById("status");
    status.textContent = message;
    status.style.color = color;
}

function selectCoffee(coffeeName ,price) {
  currentCoffee = coffeeName;
  currentPrice = price;

  setStatus(currentCoffee+" is ready for payment","black");
  updateDisplay();
}

function hasEnoughInventory(coffeeName){
    const recipe = recipes[coffeeName];

    if(!recipe){
        return false;
    } else{
        return(
            inventory.water >= recipe.water &&
            inventory.milk >= recipe.milk &&
            inventory.coffee >= recipe.coffee
        );
    }
}


function deductInventory(coffeeName){
    const recipe = recipes[coffeeName];

    inventory.water -= recipe.water;
    inventory.milk -= recipe.milk;
    inventory.coffee -= recipe.coffee;      
}

function payNow(){

    if (currentCoffee === "None") {
        setStatus("please select a Coffee","orange");
        return;
    }
    
    if(!hasEnoughInventory(currentCoffee)){
        setStatus("Not Enough Ingredients for "+currentCoffee,"red");
        return;
    }

    deductInventory(currentCoffee);

    salesHistory.push({
        coffee : currentCoffee,
        price : currentPrice,
        source : "direct",
        time : Date.now()
    });

    setStatus("Payment successful for " + currentCoffee, "green");
    currentCoffee = "None";
    currentPrice = 0;
    updateDisplay();
}

function addToQueue() {
    if (currentCoffee === "None") {
        setStatus("Select a coffee before adding to the queue","orange");
        return;
    }

    const order = {
        coffee: currentCoffee,
        price: currentPrice
    }
    orderQueue.push(order);

    setStatus(currentCoffee+" added to queue","brown");
    currentCoffee = "None";
    currentPrice = 0;
    updateDisplay();
}

function processNextOrder(){
    if (orderQueue.length === 0) {
        setStatus("No orders in Queue","orange");
        return;
    }

    const nextOrder = orderQueue.shift();
    
    if (!hasEnoughInventory(nextOrder.coffee)){
        setStatus("Not enough ingredients for queued " + nextOrder.coffee, "red");
        updateDisplay();
        return;
    }

    deductInventory(nextOrder.coffee);
    
    salesHistory.push({
        coffee : nextOrder.coffee,
        price : nextOrder.price,
        source : "queue",
        time : Date.now()
    });


    actionStack.push({
        type: "processed-order",
        order: nextOrder,
        inventorySnapshot: {
            water: inventory.water + recipes[nextOrder.coffee].water,
            milk: inventory.milk + recipes[nextOrder.coffee].milk,
            coffee: inventory.coffee + recipes[nextOrder.coffee].coffee
        }
    });

    setStatus("Processing " + nextOrder.coffee + " from queue", "green");
    updateDisplay();
}

function refillInventory(){
    actionStack.push({
        type: "refill",
        previousInventory: {
            water: inventory.water,
            milk: inventory.milk,
            coffee: inventory.coffee,
        }
    });

    inventory.water = 1200;
    inventory.milk = 700;
    inventory.coffee = 300;

    setStatus("Inventory refilled by admin", "purple");
    updateDisplay();
}

function toggleAdminPanel(){
    const inventoryPanel = document.getElementById("inventory-panel");
    const toggleButton = document.getElementById("toggle-admin-btn");
    
    if(inventoryPanel.style.display === "none"){
        inventoryPanel.style.display = "block";
        toggleButton.textContent = "Hide Admin View";
    }else {
        inventoryPanel.style.display = "none";
        toggleButton.textContent = "Show Admin View"
    }
}

function undoLastAction(){
    if(actionStack.length===0){
        setStatus("No Action to Undo","orange");
        return;
    }

    const lastAction = actionStack.pop();

    if(lastAction.type==="processed-order"){
        orderQueue.unshift(lastAction.order);

        inventory.water = lastAction.inventorySnapshot.water;
        inventory.milk = lastAction.inventorySnapshot.milk;
        inventory.coffee = lastAction.inventorySnapshot.coffee;

        salesHistory.pop();

        setStatus("Undo successful: " + lastAction.order.coffee + " returned to queue", "blue");

    }else if(lastAction.type === "refill"){
        inventory.water = lastAction.previousInventory.water;
        inventory.milk = lastAction.previousInventory.milk;
        inventory.coffee = lastAction.previousInventory.coffee;

        setStatus("Undo successful: refill reversed", "blue");
    }

    updateDisplay();
}

function searchSales(){
    const searchValue = document.getElementById("search-coffee").value.trim().toLowerCase();
    const result = document.getElementById("search-result");

    document.getElementById("search-coffee").value = "";

    if(searchValue ===""){
        result.textContent = "Please Enter a Coffee name";
        result.style.color = "orange";
        return;
    }

    let count = 0;
    
    for(let i = 0;i<salesHistory.length;++i){
        if(salesHistory[i].coffee.toLowerCase() === searchValue){
            count++;
        }
    }

    if(count > 0){
        result.textContent = "Search Result: " + count + " sale(s) found for " + searchValue;
        result.style.color = "green";
    }else{
        result.textContent = "Search Result: No sales found for " + searchValue;
        result.style.color = "red";
    }

}

function showMostPopularCoffee(){
    const result = document.getElementById("popular-result");

    if(salesHistory.length === 0){
        result.textContent = "Most Popular: No Sales Yet";
        result.style.color = "orange";
        return;
    }

    let coffeeCounts = {};

    for(let i = 0;i<salesHistory.length;++i){
        if(coffeeCounts[salesHistory[i].coffee]) coffeeCounts[salesHistory[i].coffee]++;
        else coffeeCounts[salesHistory[i].coffee] = 1;
    }

    let mostPopular = "";
    let maxCount = 0;

    for(let coffee in coffeeCounts){
        if(coffeeCounts[coffee]>maxCount){
            mostPopular = coffee;
            maxCount = coffeeCounts[coffee];
        }
    }

    result.textContent = "Most Popular: "+mostPopular+" ("+maxCount+" Sales)"
    result.style.color = "green";
}