// Plop generator configuration for AI Scheduler Dashboard
// This generates new charts, panels, and dashboard pages

export default function(plop) {
  // Chart generator
  plop.setGenerator('chart', {
    description: 'Stamp a new chart component into the kit',
    prompts: [
      {
        type: 'input',
        name: 'name',
        message: 'Chart name (PascalCase):',
        validate: (input) => {
          if (!input || input.trim().length === 0) {
            return 'Chart name is required';
          }
          if (!/^[A-Z][a-zA-Z]*$/.test(input)) {
            return 'Chart name must be in PascalCase (e.g., JobHealthBar)';
          }
          return true;
        }
      },
      {
        type: 'list',
        name: 'shape',
        message: 'Chart shape:',
        choices: ['bar', 'line', 'area', 'donut', 'gauge', 'custom'],
        default: 'bar'
      },
      {
        type: 'confirm',
        name: 'addTest',
        message: 'Add test file for this chart?',
        default: true
      }
    ],
    actions: [
      {
        type: 'add',
        path: 'src/charts/{{name}}.tsx',
        templateFile: 'templates/chart/chart.hbs',
        abortOnFail: true
      },
      {
        type: 'append',
        path: 'src/charts/index.ts',
        template: "export * from './{{name}}';\n",
        abortOnFail: true
      },
      {
        type: 'append',
        path: 'README.md',
        template: '\n### {{name}}\n\nSee `src/charts/{{name}}.tsx` for implementation.\n',
        abortOnFail: true
      }
    ]
  });

  // Panel generator
  plop.setGenerator('panel', {
    description: 'Stamp a new dashboard panel',
    prompts: [
      {
        type: 'input',
        name: 'name',
        message: 'Panel name (PascalCase):',
        validate: (input) => {
          if (!input || input.trim().length === 0) {
            return 'Panel name is required';
          }
          if (!/^[A-Z][a-zA-Z]*$/.test(input)) {
            return 'Panel name must be in PascalCase (e.g., AIIntelligencePanel)';
          }
          return true;
        }
      },
      {
        type: 'input',
        name: 'title',
        message: 'Panel title:',
        validate: (input) => {
          if (!input || input.trim().length === 0) {
            return 'Panel title is required';
          }
          return true;
        }
      },
      {
        type: 'list',
        name: 'type',
        message: 'Panel type:',
        choices: ['chart', 'metric', 'list', 'custom'],
        default: 'chart'
      }
    ],
    actions: [
      {
        type: 'add',
        path: 'src/panels/{{name}}.tsx',
        templateFile: 'templates/panel/panel.hbs',
        abortOnFail: true
      },
      {
        type: 'append',
        path: 'src/panels/index.ts',
        template: "export * from './{{name}}';\n",
        abortOnFail: true
      },
      {
        type: 'append',
        path: 'README.md',
        template: '\n### {{title}}\n\nSee `src/panels/{{name}}.tsx` for implementation.\n',
        abortOnFail: true
      }
    ]
  });

  // Dashboard generator
  plop.setGenerator('dashboard', {
    description: 'Stamp a full dashboard page',
    prompts: [
      {
        type: 'input',
        name: 'name',
        message: 'Route name (kebab-case):',
        validate: (input) => {
          if (!input || input.trim().length === 0) {
            return 'Route name is required';
          }
          if (!/^[a-z][a-z0-9-]*$/.test(input)) {
            return 'Route name must be in kebab-case (e.g., scheduler-v2)';
          }
          return true;
        }
      },
      {
        type: 'input',
        name: 'title',
        message: 'Dashboard title:',
        validate: (input) => {
          if (!input || input.trim().length === 0) {
            return 'Dashboard title is required';
          }
          return true;
        }
      },
      {
        type: 'confirm',
        name: 'addLayout',
        message: 'Include standard layout with grid and sidebar navigation?',
        default: true
      }
    ],
    actions: [
      {
        type: 'add',
        path: 'app/{{name}}/page.tsx',
        templateFile: 'templates/dashboard/page.hbs',
        abortOnFail: true
      },
      {
        type: 'append',
        path: 'README.md',
        template: '\n### {{title}} Dashboard\n\nSee `app/{{name}}/page.tsx` for implementation.\n',
        abortOnFail: true
      }
    ]
  });

  // Helper generator for primitive components
  plop.setGenerator('primitive', {
    description: 'Stamp a UI primitive component',
    prompts: [
      {
        type: 'input',
        name: 'name',
        message: 'Primitive name (PascalCase):',
        validate: (input) => {
          if (!input || input.trim().length === 0) {
            return 'Primitive name is required';
          }
          if (!/^[A-Z][a-zA-Z]*$/.test(input)) {
            return 'Primitive name must be in PascalCase (e.g., CustomCard)';
          }
          return true;
        }
      },
      {
        type: 'list',
        name: 'category',
        message: 'Category:',
        choices: ['form', 'navigation', 'layout', 'feedback', 'data-display'],
        default: 'form'
      }
    ],
    actions: [
      {
        type: 'add',
        path: 'src/primitives/{{name}}.tsx',
        templateFile: 'templates/primitive/primitive.hbs',
        abortOnFail: true
      },
      {
        type: 'append',
        path: 'src/primitives/index.ts',
        template: "export * from './{{name}}';\n",
        abortOnFail: true
      },
      {
        type: 'append',
        path: 'README.md',
        template: '\n### {{name}} Primitive\n\nSee `src/primitives/{{name}}.tsx` for implementation.\n',
        abortOnFail: true
      }
    ]
  });
}
