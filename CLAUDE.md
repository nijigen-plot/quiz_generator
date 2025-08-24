
# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

基本的なやり取りは日本語で行ってください。

## Project Overview

This is a quiz generation system that extracts company information via OpenAI API web search and generates interactive quizzes. The system has two main phases:

1. **Data Extraction** (`extract.py`) - Interactive tool to collect company information
2. **Quiz Generation** (planned) - Generate 4-choice quizzes from collected knowledge base

## Architecture

### Knowledge Base Structure
- `knowledge_base/` contains a 2-tier folder hierarchy: `{category}/{subcategory}/`
- Categories: business, culture, history, people, products
- Each subcategory contains `.md` files with company information
- Files are named with timestamp format: `YYYYMMDD_HHmmss.md`

### Data Extraction Flow
1. Company name selection (from `COMPANY_NAME` env var or user input)
2. Interactive category selection from `knowledge_base/` folders
3. Subcategory selection from chosen category
4. OpenAI API call with GPT-5 + web search tools
5. Structured markdown output saved to appropriate subfolder

## Key Commands

### Environment Setup
```bash
# Install dependencies
uv sync

# Set up environment variables
cp .env.example .env
# Add OPENAI_API_KEY and optionally COMPANY_NAME
```

### Data Extraction
```bash
python extract.py
```

## Configuration

### Required Environment Variables
- `OPENAI_API_KEY` - OpenAI API key for web search and content generation
- `COMPANY_NAME` (optional) - Default company name, otherwise prompts user

### OpenAI API Configuration
- Uses GPT-5 model with web search preview tools
- Configured for knowledge base content optimized for quiz generation
- Output format: structured markdown with URLs in `[]()`format and knowledge in `- ` list format

## Development Notes

- All functions include full type annotations with `typing.List[str]`, `-> str`, etc.
- Error handling for missing folders and API failures
- File operations use `pathlib.Path` for cross-platform compatibility
- Interactive CLI with numbered selection menus
