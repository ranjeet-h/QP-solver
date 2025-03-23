import { DocumentPickerAsset } from 'expo-document-picker';

export interface SolverResponse {
  success: boolean;
  answer: string;
  creditsUsed: number;
  remainingCredits: number;
  format: 'markdown';
}

export const solverService = {
  solveQuestion: async (questionFile: DocumentPickerAsset, referenceFile: DocumentPickerAsset): Promise<SolverResponse> => {
    // Mock API call with loading delay
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          answer: `# Solution Overview

## Key Points from Reference Material
- First key concept from the reference book
- Second important point
- Third relevant detail

## Detailed Solution
1. **Step 1**: Initial approach
   - Detailed explanation
   - Supporting evidence from reference

2. **Step 2**: Core solution
   - Mathematical calculations
   - Logical reasoning
   \`\`\`
   Example calculation or code
   \`\`\`

3. **Step 3**: Final steps
   - Verification
   - Alternative approaches

## Conclusion
Final answer with explanation

## References
- Page 24: Core concept
- Page 56: Supporting theory`,
          creditsUsed: 5,
          remainingCredits: 95,
          format: 'markdown'
        });
      }, 3000); // 3 second delay to simulate API call
    });
  }
}; 