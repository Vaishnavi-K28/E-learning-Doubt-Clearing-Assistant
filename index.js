const http = require("http");
const fs = require("fs");
const path = require("path");
const { createServer } = require("http");

const PORT = 3000;

// ─── In-memory data stores ───────────────────────────────────────────────────
const courses = {
  javascript: {
    name: "JavaScript Fundamentals",
    topics: ["variables", "functions", "arrays", "objects", "promises", "async/await", "closures", "prototypes"],
  },
  python: {
    name: "Python Programming",
    topics: ["syntax", "lists", "dictionaries", "classes", "decorators", "generators", "modules", "exceptions"],
  },
  webdev: {
    name: "Web Development",
    topics: ["html", "css", "responsive design", "flexbox", "grid", "animations", "accessibility", "seo"],
  },
  datastructures: {
    name: "Data Structures & Algorithms",
    topics: ["arrays", "linked lists", "trees", "graphs", "sorting", "searching", "dynamic programming", "recursion"],
  },
};

const qaDatabase = [
  // JavaScript
  { keywords: ["closure", "closures"], course: "javascript", question: "What is a closure?", answer: "A closure is a function that retains access to its outer (lexical) scope even after the outer function has returned. It 'closes over' the variables from its parent scope. Example:\n\nfunction makeCounter() {\n  let count = 0;\n  return function() {\n    count++;\n    return count;\n  };\n}\nconst counter = makeCounter();\ncounter(); // 1\ncounter(); // 2" },
  { keywords: ["promise", "promises"], course: "javascript", question: "How do Promises work?", answer: "A Promise represents a value that may be available now, in the future, or never. It has three states: pending, fulfilled, or rejected.\n\nconst myPromise = new Promise((resolve, reject) => {\n  // async operation\n  if (success) resolve(value);\n  else reject(error);\n});\n\nmyPromise.then(val => console.log(val)).catch(err => console.error(err));" },
  { keywords: ["async", "await"], course: "javascript", question: "What is async/await?", answer: "async/await is syntactic sugar over Promises, making asynchronous code look synchronous.\n\nasync function fetchData() {\n  try {\n    const response = await fetch('https://api.example.com/data');\n    const data = await response.json();\n    return data;\n  } catch (error) {\n    console.error('Error:', error);\n  }\n}" },
  { keywords: ["var", "let", "const", "variable", "variables"], course: "javascript", question: "What's the difference between var, let, and const?", answer: "• var: function-scoped, hoisted, can be re-declared\n• let: block-scoped, not hoisted to usable state, can be reassigned\n• const: block-scoped, not hoisted, cannot be reassigned (but object properties can be mutated)\n\nBest practice: Use const by default, let when you need to reassign, avoid var." },
  { keywords: ["prototype", "prototypes", "inheritance"], course: "javascript", question: "What is prototypal inheritance?", answer: "In JavaScript, objects inherit properties and methods from other objects through the prototype chain. Every object has a [[Prototype]] link.\n\nconst animal = { speak() { return 'some sound'; } };\nconst dog = Object.create(animal);\ndog.speak(); // 'some sound' — inherited from animal\n\nThis chain continues until Object.prototype, whose prototype is null." },
  // Python
  { keywords: ["decorator", "decorators"], course: "python", question: "What are decorators in Python?", answer: "Decorators are functions that modify the behavior of another function. They use the @syntax.\n\ndef my_decorator(func):\n    def wrapper(*args, **kwargs):\n        print('Before call')\n        result = func(*args, **kwargs)\n        print('After call')\n        return result\n    return wrapper\n\n@my_decorator\ndef greet(name):\n    print(f'Hello, {name}!')\n\ngreet('Alice')  # prints Before call, Hello Alice!, After call" },
  { keywords: ["generator", "generators", "yield"], course: "python", question: "What are generators?", answer: "Generators are functions that yield values lazily using the yield keyword, allowing iteration without loading everything into memory.\n\ndef count_up(n):\n    i = 0\n    while i < n:\n        yield i\n        i += 1\n\nfor num in count_up(5):\n    print(num)  # 0, 1, 2, 3, 4\n\nGenerators are memory-efficient for large datasets." },
  { keywords: ["list comprehension", "comprehension"], course: "python", question: "What is list comprehension?", answer: "List comprehension provides a concise way to create lists.\n\n# Traditional\nsquares = []\nfor x in range(10):\n    squares.append(x**2)\n\n# With comprehension\nsquares = [x**2 for x in range(10)]\n\n# With condition\nevens = [x for x in range(20) if x % 2 == 0]" },
  // Web Dev
  { keywords: ["flexbox", "flex"], course: "webdev", question: "How does Flexbox work?", answer: "Flexbox is a 1D layout model for distributing space along a single axis.\n\n.container {\n  display: flex;\n  justify-content: center;  /* horizontal alignment */\n  align-items: center;      /* vertical alignment */\n  gap: 16px;\n  flex-wrap: wrap;\n}\n\nKey properties: flex-direction, justify-content, align-items, flex-wrap, flex-grow, flex-shrink, flex-basis." },
  { keywords: ["grid", "css grid"], course: "webdev", question: "What is CSS Grid?", answer: "CSS Grid is a 2D layout system for both rows and columns.\n\n.container {\n  display: grid;\n  grid-template-columns: repeat(3, 1fr);\n  grid-template-rows: auto;\n  gap: 20px;\n}\n\n.item-wide {\n  grid-column: span 2;\n}\n\nUse Grid for 2D layouts, Flexbox for 1D alignment." },
  // DSA
  { keywords: ["big o", "time complexity", "complexity"], course: "datastructures", question: "What is Big O notation?", answer: "Big O describes the upper bound of an algorithm's time or space complexity as input grows.\n\nCommon complexities:\n• O(1) — Constant: array index access\n• O(log n) — Logarithmic: binary search\n• O(n) — Linear: linear search\n• O(n log n) — Linearithmic: merge sort\n• O(n²) — Quadratic: bubble sort\n• O(2ⁿ) — Exponential: recursive fibonacci\n\nAlways aim for the most efficient solution." },
  { keywords: ["recursion", "recursive"], course: "datastructures", question: "What is recursion?", answer: "Recursion is when a function calls itself to solve smaller subproblems, requiring a base case to stop.\n\nfunction factorial(n) {\n  if (n <= 1) return 1;        // base case\n  return n * factorial(n - 1); // recursive case\n}\n\nfactorial(5); // 5 * 4 * 3 * 2 * 1 = 120\n\nTip: Every recursive solution can be converted to an iterative one." },
];

let conversations = {};
let sessionCounter = 1;

// ─── AI-like response engine ──────────────────────────────────────────────────
function findAnswer(query, courseFilter) {
  const q = query.toLowerCase();

  // Search through Q&A database
  let matches = qaDatabase.filter((item) => {
    const courseMatch = !courseFilter || courseFilter === "all" || item.course === courseFilter;
    const keywordMatch = item.keywords.some((kw) => q.includes(kw));
    return courseMatch && keywordMatch;
  });

  if (matches.length > 0) {
    return {
      type: "answer",
      matched: true,
      data: matches[0],
      relatedTopics: matches.slice(1).map((m) => m.question),
    };
  }

  // Fuzzy match on question content
  const words = q.split(/\s+/).filter((w) => w.length > 3);
  matches = qaDatabase.filter((item) => {
    const courseMatch = !courseFilter || courseFilter === "all" || item.course === courseFilter;
    const wordMatch = words.some((w) => item.question.toLowerCase().includes(w) || item.answer.toLowerCase().includes(w));
    return courseMatch && wordMatch;
  });

  if (matches.length > 0) {
    return {
      type: "suggestion",
      matched: false,
      suggestions: matches.slice(0, 3),
    };
  }

  return { type: "not_found", matched: false };
}

function generateResponse(query, courseFilter, sessionId) {
  const q = query.toLowerCase().trim();

  // Greeting detection
  if (/^(hi|hello|hey|good\s*(morning|afternoon|evening))/.test(q)) {
    return { type: "greeting", message: "Hello! 👋 I'm your E-learning Doubt Clearing Assistant. Ask me anything about your courses — concepts, code examples, or explanations. What would you like to learn today?" };
  }

  // Course listing
  if (/what courses|available courses|list courses|show courses/.test(q)) {
    return { type: "courses", courses };
  }

  // Topics listing
  const courseKeys = Object.keys(courses);
  for (const key of courseKeys) {
    if (q.includes(key) && /topic|what can|what do|syllabus/.test(q)) {
      return { type: "topics", course: courses[key] };
    }
  }

  return findAnswer(query, courseFilter);
}
