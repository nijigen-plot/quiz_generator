import { NextResponse } from 'next/server';
import { readdir, stat } from 'fs/promises';
import { join } from 'path';

interface Company {
  name: string;
  categories: Category[];
}

interface Category {
  name: string;
  subcategories: string[];
  hasFiles: boolean;
}

export async function GET() {
  try {
    const knowledgeBasePath = join(process.cwd(), '..', 'knowledge_base');
    
    // Get all company directories
    const companyDirs = await readdir(knowledgeBasePath);
    const companies: Company[] = [];

    for (const companyDir of companyDirs) {
      const companyPath = join(knowledgeBasePath, companyDir);
      const companyStats = await stat(companyPath);
      
      if (companyStats.isDirectory()) {
        // Get categories for this company
        const categoryDirs = await readdir(companyPath);
        const categories: Category[] = [];

        for (const categoryDir of categoryDirs) {
          const categoryPath = join(companyPath, categoryDir);
          const categoryStats = await stat(categoryPath);
          
          if (categoryStats.isDirectory()) {
            // Get subcategories
            const subcategoryDirs = await readdir(categoryPath);
            const subcategories: string[] = [];
            let hasFiles = false;

            for (const subcategoryDir of subcategoryDirs) {
              const subcategoryPath = join(categoryPath, subcategoryDir);
              const subcategoryStats = await stat(subcategoryPath);
              
              if (subcategoryStats.isDirectory()) {
                // Check if this subcategory has .md files
                const files = await readdir(subcategoryPath);
                const mdFiles = files.filter(file => file.endsWith('.md'));
                
                if (mdFiles.length > 0) {
                  subcategories.push(subcategoryDir);
                  hasFiles = true;
                }
              }
            }

            if (hasFiles) {
              categories.push({
                name: categoryDir,
                subcategories,
                hasFiles
              });
            }
          }
        }

        if (categories.length > 0) {
          companies.push({
            name: companyDir,
            categories
          });
        }
      }
    }

    return NextResponse.json(companies);
  } catch (error) {
    console.error('Error reading knowledge base:', error);
    return NextResponse.json(
      { error: 'Failed to read knowledge base' },
      { status: 500 }
    );
  }
}