import bubbletwist from './src/bubbletea/bubbletwist.webp';
import chocoperle from './src/bubbletea/chocoperle.webp';
import fraiseparty from './src/bubbletea/fraiseparty.webp';
import menthefraise from './src/bubbletea/menthefraise.webp';
import menthelatte from './src/bubbletea/menthelatte.webp';
import passionlait from './src/bubbletea/passionlait.webp';
import passionmint from './src/bubbletea/passionmint.webp';
import strawmilo from './src/bubbletea/strawmilo.webp';
import sweettropik from './src/bubbletea/sweettropik.webp';
import tropicpearl from './src/bubbletea/tropicpearl.webp';
import tropipop from './src/bubbletea/tropipop.webp';

export const products = [
  // Bubble Tea
  {
    id: 101,
    name: "Choco Perle",
    description: "Tapioca + Milo + Lait",
    price: 1500,
    category: "bubble-tea",
    image: chocoperle,
    popular: true,
    ingredients: ["Tapioca", "Milo", "Lait"],
    nutritionalInfo: {
      calories: 320,
      protein: "7",
      carbs: "48",
      fat: "5"
    },
    options: {
      milk: {
        type: "radio",
        label: "Préférence",
        choices: [
          { id: "with_milk", label: "Avec lait", price: 500 },
          { id: "without_milk", label: "Sans lait", price: 0 }
        ]
      }
    }
  },
  {
    id: 102,
    name: "Menthe Latté",
    description: "Tapioca + Sirop de menthe + Lait",
    price: 1500,
    category: "bubble-tea",
    image: menthelatte,
    popular: true,
    ingredients: ["Tapioca", "Sirop de menthe", "Lait"],
    nutritionalInfo: {
      calories: 280,
      protein: "6",
      carbs: "45",
      fat: "4"
    },
    options: {
      milk: {
        type: "radio",
        label: "Préférence",
        choices: [
          { id: "with_milk", label: "Avec lait", price: 500 },
          { id: "without_milk", label: "Sans lait", price: 0 }
        ]
      }
    }
  },
  {
    id: 103,
    name: "Tropic Pearl",
    description: "Tapioca + Sirop tropical + Lait",
    price: 1500,
    category: "bubble-tea",
    image: tropicpearl,
    popular: true,
    ingredients: ["Tapioca", "Sirop tropical", "Lait"],
    nutritionalInfo: {
      calories: 260,
      protein: "5",
      carbs: "42",
      fat: "3"
    },
    options: {
      milk: {
        type: "radio",
        label: "Préférence",
        choices: [
          { id: "with_milk", label: "Avec lait", price: 500 },
          { id: "without_milk", label: "Sans lait", price: 0 }
        ]
      }
    }
  },
  {
    id: 104,
    name: "Bubble Twist",
    description: "Tapioca + Sirop de menthe + Sirop tropical + Lait",
    price: 1500,
    category: "bubble-tea",
    image: bubbletwist,
    popular: false,
    ingredients: ["Tapioca", "Sirop de menthe", "Sirop tropical", "Lait"],
    nutritionalInfo: {
      calories: 300,
      protein: "6",
      carbs: "47",
      fat: "4"
    },
    options: {
      milk: {
        type: "radio",
        label: "Préférence",
        choices: [
          { id: "with_milk", label: "Avec lait", price: 500 },
          { id: "without_milk", label: "Sans lait", price: 0 }
        ]
      }
    }
  },

  // Bubble Tea BOBA FRAISE BASE
  {
    id: 105,
    name: "Fraise Party",
    description: "Boba fraise + Sirop de fraise + Lait",
    price: 1500,
    category: "bubble-tea",
    image: fraiseparty,
    popular: true,
    ingredients: ["Boba fraise", "Sirop de fraise", "Lait"],
    nutritionalInfo: {
      calories: 290,
      protein: "5",
      carbs: "46",
      fat: "4"
    },
    options: {
      milk: {
        type: "radio",
        label: "Préférence",
        choices: [
          { id: "with_milk", label: "Avec lait", price: 500 },
          { id: "without_milk", label: "Sans lait", price: 0 }
        ]
      }
    }
  },
  {
    id: 106,
    name: "StrawMilo",
    description: "Boba fraise + Milo + Lait",
    price: 1500,
    category: "bubble-tea",
    image: strawmilo,
    popular: true,
    ingredients: ["Boba fraise", "Milo", "Lait"],
    nutritionalInfo: {
      calories: 320,
      protein: "7",
      carbs: "48",
      fat: "5"
    },
    options: {
      milk: {
        type: "radio",
        label: "Préférence",
        choices: [
          { id: "with_milk", label: "Avec lait", price: 500 },
          { id: "without_milk", label: "Sans lait", price: 0 }
        ]
      }
    }
  },
  {
    id: 107,
    name: "Sweet Tropik",
    description: "Boba fraise + Sirop tropical + Lait",
    price: 1500,
    category: "bubble-tea",
    image: sweettropik,
    popular: false,
    ingredients: ["Boba fraise", "Sirop tropical", "Lait"],
    nutritionalInfo: {
      calories: 275,
      protein: "5",
      carbs: "44",
      fat: "4"
    },
    options: {
      milk: {
        type: "radio",
        label: "Préférence",
        choices: [
          { id: "with_milk", label: "Avec lait", price: 500 },
          { id: "without_milk", label: "Sans lait", price: 0 }
        ]
      }
    }
  },
  {
    id: 108,
    name: "Menthe Fraise",
    description: "Boba fraise + Sirop de menthe + Lait",
    price: 1500,
    category: "bubble-tea",
    image: menthefraise,
    popular: true,
    ingredients: ["Boba fraise", "Sirop de menthe", "Lait"],
    nutritionalInfo: {
      calories: 270,
      protein: "5",
      carbs: "43",
      fat: "3"
    },
    options: {
      milk: {
        type: "radio",
        label: "Préférence",
        choices: [
          { id: "with_milk", label: "Avec lait", price: 500 },
          { id: "without_milk", label: "Sans lait", price: 0 }
        ]
      }
    }
  },

  // Bubble Tea BOBA PASSION BASE
  {
    id: 109,
    name: "TropiPop",
    description: "Boba passion + Sirop tropical + Lait",
    price: 1500,
    category: "bubble-tea",
    image: tropipop,
    popular: true,
    ingredients: ["Boba passion", "Sirop tropical", "Lait"],
    nutritionalInfo: {
      calories: 290,
      protein: "6",
      carbs: "47",
      fat: "4"
    },
    options: {
      milk: {
        type: "radio",
        label: "Préférence",
        choices: [
          { id: "with_milk", label: "Avec lait", price: 500 },
          { id: "without_milk", label: "Sans lait", price: 0 }
        ]
      }
    }
  },
  {
    id: 110,
    name: "Passion Lait",
    description: "Boba passion + Lait",
    price: 1500,
    category: "bubble-tea",
    image: passionlait,
    popular: true,
    ingredients: ["Boba passion", "Lait"],
    nutritionalInfo: {
      calories: 260,
      protein: "5",
      carbs: "43",
      fat: "3"
    },
    options: {
      milk: {
        type: "radio",
        label: "Préférence",
        choices: [
          { id: "with_milk", label: "Avec lait", price: 500 },
          { id: "without_milk", label: "Sans lait", price: 0 }
        ]
      }
    }
  },
  {
    id: 111,
    name: "Passion Mint",
    description: "Boba passion + Sirop de menthe + Lait",
    price: 1500,
    category: "bubble-tea",
    image: passionmint,
    popular: false,
    ingredients: ["Boba passion", "Sirop de menthe", "Lait"],
    nutritionalInfo: {
      calories: 270,
      protein: "5",
      carbs: "44",
      fat: "3"
    },
    options: {
      milk: {
        type: "radio",
        label: "Préférence",
        choices: [
          { id: "with_milk", label: "Avec lait", price: 500 },
          { id: "without_milk", label: "Sans lait", price: 0 }
        ]
      }
    }
  }
];

export const categories = [
  { id: "tacos", name: "Tacos", icon: "taco" },
  { id: "bubble-tea", name: "Bubble Tea", icon: "cup" }
];

export const getProductById = (id) => {
  return products.find(product => product.id === parseInt(id));
};

export const getProductsByCategory = (categoryId) => {
  return products.filter(product => product.category === categoryId);
};

export const getPopularProducts = () => {
  return products.filter(product => product.popular);
};
