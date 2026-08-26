import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import prompts from 'prompts';
import { DocConfig, ThemePreset, ColorMode } from '../../runtime/types';
import { DEFAULT_CONFIG } from '../../runtime/config';

export async function configTuiCommand(configPathArg?: string) {
  console.log(chalk.bold.magenta('\n⚡ DocMeDown - Interactive Configuration Wizard\n'));

  // Resolve config path
  let configPath = '';
  if (configPathArg) {
    configPath = path.resolve(process.cwd(), configPathArg);
    if (fs.existsSync(configPath) && fs.statSync(configPath).isDirectory()) {
      configPath = path.join(configPath, 'docs.json');
    }
  } else {
    const candidates = [
      path.resolve(process.cwd(), 'docs.json'),
      path.resolve(process.cwd(), 'docs/docs.json'),
      path.resolve(process.cwd(), 'dmd.json'),
    ];
    configPath = candidates.find((p) => fs.existsSync(p)) || path.resolve(process.cwd(), 'docs/docs.json');
  }

  let existingConfig: DocConfig = DEFAULT_CONFIG;
  if (fs.existsSync(configPath)) {
    try {
      existingConfig = { ...DEFAULT_CONFIG, ...JSON.parse(fs.readFileSync(configPath, 'utf-8')) };
      console.log(chalk.dim(`  Loaded existing configuration from: ${configPath}\n`));
    } catch {
      console.warn(chalk.yellow(`  ⚠ Error reading ${configPath}, starting fresh.\n`));
    }
  } else {
    console.log(chalk.dim(`  Creating new configuration at: ${configPath}\n`));
  }

  const response = await prompts([
    {
      type: 'text',
      name: 'name',
      message: 'Project Name:',
      initial: existingConfig.name || 'My Project Docs',
    },
    {
      type: 'text',
      name: 'tagline',
      message: 'Tagline / Short description:',
      initial: existingConfig.tagline || 'The simplest Markdown documenter yet',
    },
    {
      type: 'select',
      name: 'preset',
      message: 'Select Theme Color Palette:',
      choices: [
        { title: 'Indigo (Modern & Clean)', value: 'indigo' },
        { title: 'Emerald (Fresh & Tech)', value: 'emerald' },
        { title: 'Sunset (Warm Amber)', value: 'sunset' },
        { title: 'Violet (Vibrant Purple)', value: 'violet' },
        { title: 'Rose (Bold Quartz)', value: 'rose' },
        { title: 'Slate (Minimalist Monochrome)', value: 'slate' },
        { title: 'Cyberpunk (Neon Glow)', value: 'cyberpunk' },
      ],
      initial: ['indigo', 'emerald', 'sunset', 'violet', 'rose', 'slate', 'cyberpunk'].indexOf(
        existingConfig.theme?.preset || 'indigo'
      ),
    },
    {
      type: 'select',
      name: 'defaultMode',
      message: 'Default Color Mode:',
      choices: [
        { title: 'Auto (Follows OS system preference)', value: 'auto' },
        { title: 'Dark (Default dark theme)', value: 'dark' },
        { title: 'Light (Default light theme)', value: 'light' },
      ],
      initial: ['auto', 'dark', 'light'].indexOf(existingConfig.theme?.defaultMode || 'auto'),
    },
    {
      type: 'select',
      name: 'sourceType',
      message: 'Documentation Source Mode:',
      choices: [
        { title: 'Local Markdown Files (hosted together in folder)', value: 'local' },
        { title: 'Remote GitHub Repository (live dynamic fetch)', value: 'github' },
        { title: 'Remote GitLab Repository (live dynamic fetch)', value: 'gitlab' },
      ],
      initial: existingConfig.source?.type ? (existingConfig.source.type === 'github' ? 1 : 2) : 0,
    },
    {
      type: (prev) => (prev === 'github' ? 'text' : null),
      name: 'githubRepo',
      message: 'GitHub Repository (owner/repo):',
      initial: existingConfig.source?.repo || 'facebook/react',
    },
    {
      type: (prev, values) => (values.sourceType === 'github' ? 'text' : null),
      name: 'githubBranch',
      message: 'GitHub Branch:',
      initial: existingConfig.source?.branch || 'main',
    },
    {
      type: (prev, values) => (values.sourceType === 'github' ? 'text' : null),
      name: 'githubDocsDir',
      message: 'GitHub Docs Subfolder (leave empty for root):',
      initial: existingConfig.source?.docsDir || 'docs',
    },
    {
      type: 'text',
      name: 'githubSocial',
      message: 'GitHub Repository URL for Navbar link (optional):',
      initial: existingConfig.socials?.find((s) => s.type === 'github')?.url || '',
    },
  ]);

  if (!response.name) {
    console.log(chalk.yellow('\nConfiguration cancelled.'));
    return;
  }

  const updatedConfig: DocConfig = {
    ...existingConfig,
    name: response.name,
    tagline: response.tagline,
    theme: {
      ...existingConfig.theme,
      preset: response.preset as ThemePreset,
      defaultMode: response.defaultMode as ColorMode,
    },
    socials: response.githubSocial
      ? [{ type: 'github', url: response.githubSocial }]
      : existingConfig.socials,
  };

  if (response.sourceType === 'github') {
    updatedConfig.source = {
      type: 'github',
      repo: response.githubRepo,
      branch: response.githubBranch,
      docsDir: response.githubDocsDir,
    };
  } else if (response.sourceType === 'local') {
    delete updatedConfig.source;
  }

  const dir = path.dirname(configPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(configPath, JSON.stringify(updatedConfig, null, 2), 'utf-8');
  console.log(chalk.bold.green(`\n✔ Configuration successfully saved to: ${configPath}\n`));
}
