# Contributing to Rubato

Thank you for your interest in contributing to Rubato! This open-source sight-reading platform aims to help musicians improve their skills through progressive, instrument-specific exercises.

## Table of Contents
- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Process](#development-process)
- [Submitting Changes](#submitting-changes)
- [Coding Standards](#coding-standards)
- [Musical Content Guidelines](#musical-content-guidelines)
- [Testing Requirements](#testing-requirements)
- [Security Guidelines](#security-guidelines)

## Code of Conduct

### Our Pledge
We are committed to providing a welcoming and inspiring community for all. Contributors are expected to:
- Be respectful and inclusive
- Welcome newcomers and help them get started
- Focus on what is best for the community
- Show empathy towards other community members

### Unacceptable Behavior
- Harassment, discrimination, or offensive comments
- Personal attacks or trolling
- Publishing others' private information
- Any conduct which could reasonably be considered inappropriate

## Getting Started

### Prerequisites
1. Node.js 20.11.0 or higher
2. pnpm package manager
3. Git
4. A Cloudflare account (for backend development)

### Setting Up Your Development Environment
```bash
# Clone the repository
git clone https://github.com/rubato-app/rubato.git
cd rubato

# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env.local
# Edit .env.local with your values (never commit this file)

# Start development server
pnpm run dev
```

## Development Process

### 1. Find or Create an Issue
- Check existing issues for something you'd like to work on
- For new features or bugs, create an issue first to discuss
- Wait for maintainer feedback before starting major work

### 2. Create a Branch
```bash
# For features
git checkout -b feature/descriptive-feature-name

# For bug fixes
git checkout -b fix/descriptive-bug-name

# For documentation
git checkout -b docs/descriptive-doc-name
```

### 3. Make Your Changes
- Follow the coding standards in DEVELOPMENT_GUIDELINES.md
- Write tests for new functionality
- Update documentation as needed
- Ensure all tests pass

### 4. Commit Your Changes
Follow our commit message format:
```bash
<type>(<scope>): <description>

# Types: feat, fix, docs, style, refactor, test, chore
# Examples:
feat(guitar): add position-based exercise generation
fix(audio): resolve Safari audio context initialization
docs(api): update authentication endpoint documentation
```

## Submitting Changes

### Pull Request Process
1. Update your branch with the latest main:
   ```bash
   git checkout main
   git pull origin main
   git checkout your-branch
   git rebase main
   ```

2. Push your branch:
   ```bash
   git push origin your-branch
   ```

3. Create a Pull Request on GitHub
4. Fill out the PR template completely
5. Wait for code review

### PR Requirements
- [ ] All tests passing
- [ ] No linting errors
- [ ] Documentation updated
- [ ] Follows coding standards
- [ ] Musical accuracy verified (for music-related changes)
- [ ] Security considerations addressed

## Coding Standards

### TypeScript/JavaScript
- Use TypeScript for all new code
- Prefer functional components in React
- Use proper typing (avoid `any`)
- Follow ESLint and Prettier configurations

### CSS/Styling
- Use Tailwind CSS utility classes
- Follow mobile-first responsive design
- Maintain consistent spacing and typography

### Example Code Style
```typescript
// ✅ Good
interface ExerciseProps {
  instrument: 'guitar' | 'piano';
  difficulty: number;
  onComplete: (accuracy: number) => void;
}

export const Exercise: React.FC<ExerciseProps> = ({ 
  instrument, 
  difficulty, 
  onComplete 
}) => {
  // Implementation
};

// ❌ Bad
export const Exercise = (props: any) => {
  // Implementation
};
```

## Musical Content Guidelines

### Accuracy Requirements
- All musical notation must be theoretically correct
- Exercises must follow established pedagogical principles
- Instrument-specific techniques must be appropriate
- Difficulty progression must be smooth and logical

### Content Sources
- Only use properly licensed content (CC BY 4.0, public domain)
- Always provide proper attribution
- Verify copyright status before adding any musical content

## Testing Requirements

### Unit Tests
- Write tests for all new functions and components
- Maintain minimum 80% code coverage
- Use descriptive test names

### Integration Tests
- Test complete user workflows
- Verify API endpoints work correctly
- Test cross-browser compatibility

### Manual Testing
- Test on real devices (mobile and desktop)
- Verify audio works correctly
- Check accessibility features
- Test with actual musicians when possible

## Security Guidelines

### NEVER Commit Secrets
- No API keys, tokens, or passwords in code
- Use environment variables for all sensitive data
- Check `.gitignore` includes all sensitive files

### Environment Variables
```bash
# ✅ Good
const apiKey = process.env.VITE_API_KEY;

// ❌ Bad
const apiKey = 'sk_live_abc123';
```

### Reporting Security Issues
For security vulnerabilities, please email security@rubato.app instead of creating a public issue.

## Getting Help

### Resources
- Read the [README.md](../README.md) for project overview
- Check [DEVELOPMENT_GUIDELINES.md](../DEVELOPMENT_GUIDELINES.md) for detailed standards
- Review [INFRASTRUCTURE.md](../INFRASTRUCTURE.md) for technical setup
- See [ROADMAP.md](../ROADMAP.md) for planned features

### Communication
- GitHub Issues: Bug reports and feature requests
- GitHub Discussions: General questions and ideas
- Pull Request comments: Code-specific discussions

## Recognition

Contributors will be recognized in:
- The project README
- Release notes
- The application's credits page

Thank you for helping make music education more accessible through open source!