# Stride Soles :)

A modern Shopify theme built with Tailwind CSS following Shopify's evergreen web ideology using native CSS and JavaScript without build tools or compilers.

## Prerequisites

- [Node.js](https://nodejs.org/) (version 16 or higher)
- [pnpm](https://pnpm.io/) package manager
- [Shopify CLI](https://shopify.dev/docs/api/shopify-cli)

## Getting Started

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Development

Start the development environment with both Tailwind CSS and Shopify CLI running concurrently:

```bash
pnpm dev
```

This command runs:

- `dev:tailwind` - Watches and compiles Tailwind CSS
- `dev:shopify` - Connects to your Shopify theme and enables live reloading

## Development Workflow

### Styling Guidelines

**Important:** Do not write styles directly into `theme.css`. Instead:

- Use `_dev-theme.css` for custom styles
- Configure article styles in `tailwindconfig.js`
- Let Tailwind handle the compilation process

### File Structure

```
├── _dev-theme.css          # Custom development styles
├── tailwindconfig.js       # Tailwind configuration & article styles
├── theme.css              # Generated styles (do not edit)
├── package.json           # Dependencies and scripts
└── ...                    # Other theme files
```

## Architecture

This theme follows Shopify's **evergreen web ideology**, emphasizing:

- Native CSS and JavaScript
- No build tools or compilers (except for Tailwind CSS processing)
- Modern web standards
- Progressive enhancement
- Optimal performance

## Scripts

- `pnpm dev` - Start development environment (Tailwind + Shopify CLI)
- `pnpm dev:tailwind` - Watch and compile Tailwind CSS only
- `pnpm dev:shopify` - Start Shopify CLI development server only

## Resources

- [Shopify CLI Documentation](https://shopify.dev/docs/api/shopify-cli)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Shopify Theme Development](https://shopify.dev/docs/themes)

---

Happy coding! 🛍️
