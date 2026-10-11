// Helper script to generate components using the Plop generator
const fs = require('fs');
const path = require('path');

async function generateChart() {
  console.log('Generating chart component...');
  const { default: plop } = await import('./plopfile.mjs');
  
  const plopInstance = plop();
  const answers = {
    name: 'CustomChart',
    shape: 'bar',
    addTest: true
  };
  
  const results = plopInstance.runActions('chart', answers);
  
  console.log('Chart generated successfully!');
  console.log(results);
}

async function generatePanel() {
  console.log('Generating panel component...');
  const { default: plop } = await import('./plopfile.mjs');
  
  const plopInstance = plop();
  const answers = {
    name: 'CustomPanel',
    title: 'Custom Panel',
    type: 'chart'
  };
  
  const results = plopInstance.runActions('panel', answers);
  
  console.log('Panel generated successfully!');
  console.log(results);
}

async function generateDashboard() {
  console.log('Generating dashboard page...');
  const { default: plop } = await import('./plopfile.mjs');
  
  const plopInstance = plop();
  const answers = {
    name: 'custom-dashboard',
    title: 'Custom Dashboard',
    addLayout: true
  };
  
  const results = plopInstance.runActions('dashboard', answers);
  
  console.log('Dashboard generated successfully!');
  console.log(results);
}

async function main() {
  const command = process.argv[2];
  
  try {
    switch (command) {
      case 'chart':
        await generateChart();
        break;
      case 'panel':
        await generatePanel();
        break;
      case 'dashboard':
        await generateDashboard();
        break;
      default:
        console.log('Usage: node scripts/generate.js <chart|panel|dashboard>');
        process.exit(1);
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
