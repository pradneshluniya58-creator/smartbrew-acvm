let currentCoffee = "None";
let currentPrice = 0;

let orderQueue = [];
let actionStack = [];
let salesHistory = [];

let machineState = "idle"; // States: 'idle', 'selected', 'paying', 'brewing', 'ready', 'error'

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
    return salesHistory.reduce((total, sale) => total + sale.price, 0);
}

function highlightSelectedCoffee(coffeeName) {
    const cards = document.querySelectorAll(".drink-card");
    cards.forEach(card => {
        card.classList.toggle("selected", card.dataset.coffee === coffeeName);
    });
}

function updateDisplay() {
    document.getElementById("selected-coffee").textContent = "Selected Coffee: " + currentCoffee;
    document.getElementById("selected-price").textContent = "Price: ₹" + currentPrice;
    document.getElementById("queue-count").textContent = "Orders in Queue: " + orderQueue.length;

    if (orderQueue.length === 0) {
        document.getElementById("next-queue").textContent = "Next in Queue: None";
    } else {
        document.getElementById("next-queue").textContent = "Next in Queue: " + orderQueue[0].coffee;
    }

    document.getElementById("sales-count").textContent = "Total Sales: " + salesHistory.length;
    document.getElementById("total-revenue").textContent = "Total Revenue: ₹" + calculateTotalRevenue(); 
    if (salesHistory.length === 0) {
        document.getElementById("last-sale").textContent = "Last Sale: None";
    } else {
        document.getElementById("last-sale").textContent = "Last Sale: " + salesHistory[salesHistory.length - 1].coffee;
    }

    document.getElementById("water-stock").textContent = "Water: " + inventory.water + "ml";
    document.getElementById("milk-stock").textContent = "Milk: " + inventory.milk + "ml";
    document.getElementById("coffee-stock").textContent = "Coffee: " + inventory.coffee + "g";
}

function setStatus(message, color) {
    const status = document.getElementById("status");
    if (status) {
        status.textContent = message;
        status.style.color = color;
    }
}

function setMachineState(newState, labelText) {
    machineState = newState;
    const modeBadge = document.getElementById("screen-system-mode");
    const machineChassis = document.getElementById("machine-chassis");
    const stepLabel = document.getElementById("screen-step-label");
    const telemetryIndicator = document.getElementById("hud-telemetry-indicator");

    if (modeBadge) {
        modeBadge.className = "screen-mode mode-" + newState;
        modeBadge.textContent = newState.toUpperCase();
    }

    if (machineChassis) {
        machineChassis.classList.remove("machine--busy", "machine--ready");
        if (newState === "paying" || newState === "brewing") {
            machineChassis.classList.add("machine--busy");
        } else if (newState === "ready") {
            machineChassis.classList.add("machine--ready");
        }
    }

    if (stepLabel && labelText) {
        stepLabel.textContent = labelText;
    }

    if (telemetryIndicator) {
        if (newState === "brewing") {
            telemetryIndicator.textContent = "HEATING & DISPENSING";
            telemetryIndicator.style.color = "#fbbf24";
        } else if (newState === "ready") {
            telemetryIndicator.textContent = "COLLECT CUP";
            telemetryIndicator.style.color = "#4ade80";
        } else if (newState === "paying") {
            telemetryIndicator.textContent = "PROCESSING PAYMENT";
            telemetryIndicator.style.color = "#38bdf8";
        } else {
            telemetryIndicator.textContent = "STANDBY READY";
            telemetryIndicator.style.color = "#10b981";
        }
    }

    setControlsLocked(newState === "paying" || newState === "brewing");
}

function setControlsLocked(locked) {
    const buttonsToLock = [
        document.getElementById("pay-now-btn"),
        document.getElementById("add-to-queue-btn"),
        document.getElementById("process-order-btn"),
        document.getElementById("undo-btn"),
        document.getElementById("refill-btn")
    ];

    buttonsToLock.forEach(btn => {
        if (btn) btn.disabled = locked;
    });

    const drinkCards = document.querySelectorAll(".drink-card");
    drinkCards.forEach(card => {
        card.disabled = locked;
    });
}

function selectCoffee(coffeeName, price) {
    if (machineState === "paying" || machineState === "brewing") {
        return;
    }

    currentCoffee = coffeeName;
    currentPrice = price;

    setMachineState("selected", "PAYMENT PENDING");
    setStatus(currentCoffee + " is ready for payment", "black");
    updateDisplay();
    highlightSelectedCoffee(coffeeName);
}

function hasEnoughInventory(coffeeName) {
    const recipe = recipes[coffeeName];
    if (!recipe) {
        return false;
    }
    return (
        inventory.water >= recipe.water &&
        inventory.milk >= recipe.milk &&
        inventory.coffee >= recipe.coffee
    );
}

function deductInventory(coffeeName) {
    const recipe = recipes[coffeeName];
    inventory.water -= recipe.water;
    inventory.milk -= recipe.milk;
    inventory.coffee -= recipe.coffee;
}

/**
 * Reusable brewing sequence controller for direct payments and queued orders.
 * Timing:
 * 0.0s - 0.4s: Payment/order validation & cup dispensation
 * 0.4s - 0.8s: Cup arrives and locks into active bay position
 * 0.8s - 3.2s: Coffee liquid flows through nozzle into cup
 * 3.2s - 3.5s: Flow cutoff & final foam settlement
 * 3.5s - 4.2s: Ready signal, drink collection, reset to standby
 */
function executeBrewingSequence(orderItem, isQueuedOrder) {
    setMachineState("paying", "AUTHENTICATING");
    setStatus("Processing transaction for " + orderItem.coffee + "...", "blue");

    const cup = document.getElementById("dispense-cup");
    const cupFill = document.getElementById("cup-fill");
    const stream = document.getElementById("coffee-stream");

    // Reset bay components
    if (cup) {
        cup.className = "cup";
    }
    if (cupFill) {
        cupFill.style.height = "0%";
    }
    if (stream) {
        stream.classList.remove("stream--visible");
    }

    // Step 1 (0.4s): Automatic cup drop into dispense bay
    setTimeout(() => {
        setMachineState("brewing", "DISPENSING CUP");
        setStatus("Dispensing cup...", "brown");
        if (cup) {
            cup.classList.add("cup--active");
        }
    }, 400);

    // Step 2 (0.8s): Trigger hot coffee extraction & liquid stream
    setTimeout(() => {
        setStatus("Brewing fresh " + orderItem.coffee + "...", "orange");
        if (stream) {
            stream.classList.add("stream--visible");
        }
        if (cup) {
            cup.classList.add("cup--brewing");
        }
    }, 800);

    // Step 3 (3.2s): Stream cutoff
    setTimeout(() => {
        if (stream) {
            stream.classList.remove("stream--visible");
        }
    }, 3200);

    // Step 4 (3.5s): Coffee filled, deduct inventory, record sale once
    setTimeout(() => {
        deductInventory(orderItem.coffee);

        salesHistory.push({
            coffee: orderItem.coffee,
            price: orderItem.price,
            source: isQueuedOrder ? "queue" : "direct",
            time: Date.now()
        });

        if (isQueuedOrder) {
            actionStack.push({
                type: "processed-order",
                order: orderItem,
                inventorySnapshot: {
                    water: inventory.water + recipes[orderItem.coffee].water,
                    milk: inventory.milk + recipes[orderItem.coffee].milk,
                    coffee: inventory.coffee + recipes[orderItem.coffee].coffee
                }
            });
        }

        if (cup) {
            cup.classList.remove("cup--brewing");
            cup.classList.add("cup--filled");
        }

        setMachineState("ready", "BEVERAGE READY");
        setStatus(orderItem.coffee + " ready! Please take your cup", "green");
        updateDisplay();
    }, 3500);

    // Step 5 (5.5s): Customer takes cup, return machine to standby
    setTimeout(() => {
        if (cup) {
            cup.className = "cup"; // returns cup to hidden state
        }
        if (cupFill) {
            cupFill.style.height = "0%";
        }

        setMachineState("idle", "SELECT COFFEE");
        setStatus("Machine Ready", "black");
        currentCoffee = "None";
        currentPrice = 0;
        highlightSelectedCoffee("");
        updateDisplay();
    }, 5500);
}

function payNow() {
    if (machineState === "paying" || machineState === "brewing") {
        return;
    }

    if (currentCoffee === "None") {
        setMachineState("error", "SELECTION REQUIRED");
        setStatus("Please select a coffee first", "orange");
        return;
    }

    if (!hasEnoughInventory(currentCoffee)) {
        setMachineState("error", "OUT OF STOCK");
        setStatus("Not enough ingredients for " + currentCoffee, "red");
        return;
    }

    const orderToBrew = {
        coffee: currentCoffee,
        price: currentPrice
    };

    executeBrewingSequence(orderToBrew, false);
}

function addToQueue() {
    if (machineState === "paying" || machineState === "brewing") {
        return;
    }

    if (currentCoffee === "None") {
        setMachineState("error", "SELECTION REQUIRED");
        setStatus("Select a coffee before adding to the queue", "orange");
        return;
    }

    const order = {
        coffee: currentCoffee,
        price: currentPrice
    };
    orderQueue.push(order);

    setStatus(currentCoffee + " added to queue", "brown");
    currentCoffee = "None";
    currentPrice = 0;
    setMachineState("idle", "SELECT COFFEE");
    updateDisplay();
    highlightSelectedCoffee("");
}

function processNextOrder() {
    if (machineState === "paying" || machineState === "brewing") {
        return;
    }

    if (orderQueue.length === 0) {
        setMachineState("error", "QUEUE EMPTY");
        setStatus("No orders in Queue", "orange");
        return;
    }

    const nextOrder = orderQueue[0];

    if (!hasEnoughInventory(nextOrder.coffee)) {
        setMachineState("error", "STOCK DEPLETED");
        setStatus("Not enough ingredients for queued " + nextOrder.coffee, "red");
        updateDisplay();
        return;
    }

    // Safely remove order once verified
    orderQueue.shift();
    updateDisplay();

    executeBrewingSequence(nextOrder, true);
}

function refillInventory() {
    if (machineState === "paying" || machineState === "brewing") {
        return;
    }

    actionStack.push({
        type: "refill",
        previousInventory: {
            water: inventory.water,
            milk: inventory.milk,
            coffee: inventory.coffee
        }
    });

    inventory.water = 1200;
    inventory.milk = 700;
    inventory.coffee = 300;

    setStatus("Inventory refilled by admin", "purple");
    updateDisplay();
}

function toggleAdminPanel() {
    const inventoryPanel = document.getElementById("inventory-panel");
    if (!inventoryPanel) return;

    if (inventoryPanel.style.display === "none" || inventoryPanel.style.display === "") {
        inventoryPanel.style.display = "flex";
    } else {
        inventoryPanel.style.display = "none";
    }
}

function undoLastAction() {
    if (machineState === "paying" || machineState === "brewing") {
        return;
    }

    if (actionStack.length === 0) {
        setStatus("No Action to Undo", "orange");
        return;
    }

    const lastAction = actionStack.pop();

    if (lastAction.type === "processed-order") {
        orderQueue.unshift(lastAction.order);

        inventory.water = lastAction.inventorySnapshot.water;
        inventory.milk = lastAction.inventorySnapshot.milk;
        inventory.coffee = lastAction.inventorySnapshot.coffee;

        salesHistory.pop();

        setStatus("Undo successful: " + lastAction.order.coffee + " returned to queue", "blue");
    } else if (lastAction.type === "refill") {
        inventory.water = lastAction.previousInventory.water;
        inventory.milk = lastAction.previousInventory.milk;
        inventory.coffee = lastAction.previousInventory.coffee;

        setStatus("Undo successful: refill reversed", "blue");
    }

    updateDisplay();
}

function searchSales() {
    const searchInput = document.getElementById("search-coffee");
    const searchValue = searchInput ? searchInput.value.trim().toLowerCase() : "";
    const result = document.getElementById("search-result");

    if (searchInput) {
        searchInput.value = "";
    }

    if (searchValue === "") {
        if (result) {
            result.textContent = "Please Enter a Coffee name";
            result.style.color = "orange";
        }
        return;
    }

    let count = 0;
    for (let i = 0; i < salesHistory.length; ++i) {
        if (salesHistory[i].coffee.toLowerCase() === searchValue) {
            count++;
        }
    }

    if (result) {
        if (count > 0) {
            result.textContent = "Search Result: " + count + " sale(s) found for " + searchValue;
            result.style.color = "green";
        } else {
            result.textContent = "Search Result: No sales found for " + searchValue;
            result.style.color = "red";
        }
    }
}

function showMostPopularCoffee() {
    const result = document.getElementById("popular-result");
    if (!result) return;

    if (salesHistory.length === 0) {
        result.textContent = "Most Popular: No Sales Yet";
        result.style.color = "orange";
        return;
    }

    let coffeeCounts = {};
    for (let i = 0; i < salesHistory.length; ++i) {
        if (coffeeCounts[salesHistory[i].coffee]) {
            coffeeCounts[salesHistory[i].coffee]++;
        } else {
            coffeeCounts[salesHistory[i].coffee] = 1;
        }
    }

    let mostPopular = "";
    let maxCount = 0;
    for (let coffee in coffeeCounts) {
        if (coffeeCounts[coffee] > maxCount) {
            mostPopular = coffee;
            maxCount = coffeeCounts[coffee];
        }
    }

    result.textContent = "Most Popular: " + mostPopular + " (" + maxCount + " Sales)";
    result.style.color = "green";
}
