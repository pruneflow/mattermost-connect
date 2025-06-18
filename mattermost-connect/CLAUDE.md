# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Mattermost Connect** is a React component library for Mattermost integration built with TypeScript, Redux Toolkit, and Material-UI. It follows atomic design principles and replicates official Mattermost behavior patterns.

## Common Commands

### Development
- `pnpm run dev` - Build library in watch mode
- `pnpm run demo` - Run demo application for testing
- `pnpm run storybook` - Component development environment

### Quality Assurance
- `pnpm run typecheck` - TypeScript type checking
- `pnpm run lint` - ESLint code linting
- `pnpm run format` - Prettier code formatting
- `pnpm test` - Run Jest tests

### Build
- `pnpm run build` - Production library build
- `pnpm run clean` - Clean build directory

## Architecture

### State Management
Uses Redux Toolkit with normalized entity structure inspired by official Mattermost patterns:
- `entities/` - Normalized data (users, teams, channels, posts)
- `views/` - UI state and current selections
- `auth/` - Authentication state
- `errors/` - Centralized error handling
- `loading/` - Loading states for async operations

### Component Structure
Follows atomic design:
- `atoms/` - Basic UI elements (Button, Avatar, etc.)
- `molecules/` - Composite components (UserCard, ChannelItem)
- `organisms/` - Complex sections (LoginForm, TeamList)
- `templates/` - Layout components

### API Integration
- Uses official `@mattermost/client` (Client4)
- Type definitions from `@mattermost/types`
- WebSocket integration for real-time features
- Centralized error handling with user-friendly messages

## Development Guidelines

### Code Standards
- Strict TypeScript mode enabled
- JSDoc comments required for public APIs
- Comprehensive error handling with timeouts
- SOLID principles and clean architecture
- Input validation and security practices

### Testing
- Jest with React Testing Library
- Component testing for all public components
- Hook testing for custom hooks
- Integration testing for API interactions

### Mattermost Fidelity
- Exact behavior replication from official Mattermost
- Use official SDK types and patterns
- Match UI/UX patterns from Mattermost webapp
- Maintain consistency with Mattermost design system

## Current Status

**Active Branch:** `refactor`
**Implementation Status:** Phases 1-3 complete (Foundation, Auth, Teams, Channels)
**Pending:** Messages, Threads, Real-time features, Polish

See PLAN.md and RULES.md for detailed development roadmap and coding standards.