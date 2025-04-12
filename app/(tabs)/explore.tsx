import React, { useState } from 'react';
import { StyleSheet, ScrollView, SafeAreaView, Platform, Alert } from 'react-native';
import { 
  Box, 
  Heading, 
  Text, 
  VStack,
  HStack,
  Icon,
  Pressable,
  Divider,
  Button,
  ButtonText,
  ButtonSpinner
} from '@/components/ui';
import Constants from 'expo-constants';
import { Feather } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import { router } from 'expo-router';

// Restore mock history data
const historyItems = [
  {
    id: '1',
    question: 'What is the difference between mitosis and meiosis?',
    date: '2023-05-15T14:30:00',
    creditsUsed: 5,
    answer: '# Mitosis vs Meiosis\n\nMitosis results in two identical daughter cells, whereas meiosis results in four sex cells. [...]'
  },
  {
    id: '2',
    question: 'Solve the quadratic equation: 3x² + 8x - 16 = 0',
    date: '2023-05-14T09:45:00',
    creditsUsed: 5,
    answer: '# Quadratic Solution\n\nThe solutions are x = 4/3 and x = -4. [...] '
  },
  {
    id: '3',
    question: 'Explain the process of photosynthesis and its importance.',
    date: '2023-05-10T16:20:00',
    creditsUsed: 5,
    answer: '# Photosynthesis\n\nPlants use sunlight, water, and carbon dioxide... [...]'
  },
  {
    id: '4',
    question: 'What are the causes and effects of the Industrial Revolution?',
    date: '2023-05-05T11:15:00',
    creditsUsed: 5,
    answer: '# Industrial Revolution\n\nKey causes include technological innovation... [...] '
  },
];

// Simplified reusable export function (define within component for now)
const exportContentAsFile = async (content: string, format: 'pdf' | 'md', baseFilename: string) => {
  if (!content) return { success: false, message: 'No content to export' };
  
  try {
    if (format === 'pdf') {
      const htmlContent = `...`; // Same HTML template structure as in HomeScreen
       // Ensure content is correctly inserted into the template
      const finalHtml = htmlContent.replace('${streamedAnswerContent}', content); 
      const { uri } = await Print.printToFileAsync({ html: finalHtml, base64: false });
      const pdfFilename = `${baseFilename}.pdf`;
      const newPdfUri = `${FileSystem.cacheDirectory}${pdfFilename}`;
      // Move file to have a predictable name for sharing
      await FileSystem.moveAsync({ from: uri, to: newPdfUri });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(newPdfUri, { mimeType: 'application/pdf', dialogTitle: 'Export Solution as PDF', UTI: 'com.adobe.pdf' });
        return { success: true };
      } else {
        return { success: false, message: 'Sharing not available.' };
      }
    } else { // md format
      const mdFilename = `${baseFilename}.md`;
      const fileUri = `${FileSystem.cacheDirectory}${mdFilename}`;
      await FileSystem.writeAsStringAsync(fileUri, content, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, { 
          mimeType: 'text/markdown',
          dialogTitle: 'Export Solution as Markdown',
          UTI: 'net.daringfireball.markdown' 
        });
        return { success: true };
      } else {
        return { success: false, message: 'Sharing not available.' };
      }
    }
  } catch (error: any) {
    console.error('Export error:', error);
    return { success: false, message: error.message || 'Failed to export file.' };
  }
};

export default function ExploreScreen() {
  const [exportingId, setExportingId] = useState<string | null>(null); // Track which item is exporting

  // Restore formatDate helper
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  // Restore handleHistoryItemPress
  const handleHistoryItemPress = (id: string) => {
    console.log(`Navigate to history item ${id} details...`);
    // Example: router.push(`/history/${id}`);
  };

  const handleCardPress = (contentType: string) => {
    console.log(`Navigate to ${contentType} content...`);
    if (contentType === 'tips') {
      router.push('/solver-tips');
    }
  };

  // Handler for exporting a specific history item
  const handleExportHistoryItem = async (item: typeof historyItems[0], format: 'pdf' | 'md') => {
    setExportingId(item.id); // Show loading state for this item
    const baseFilename = item.question.substring(0, 20).replace(/\s+/g, '_') || `solution_${item.id}`;
    const result = await exportContentAsFile(item.answer, format, baseFilename);
    setExportingId(null); // Hide loading state

    if (!result.success) {
      Alert.alert('Export Failed', result.message || 'Could not export the file.');
    }
  };

  return (
    <Box className="bg-gray-50 dark:bg-black flex-1">
      <SafeAreaView style={{ flex: 1, paddingTop: Platform.OS === 'android' ? Constants.statusBarHeight : 0 }}>
        {/* Update Header */}
        <Box className="px-4 pt-4 pb-2 border-b border-gray-200 dark:border-gray-700">
          <Heading size="xl" className="text-gray-900 dark:text-gray-100">History & Tips</Heading>
           <Text size="sm" className="text-gray-600 dark:text-gray-400 mt-1">
             Review past solves and discover helpful tricks.
           </Text>
        </Box>
        
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <VStack space="lg">

            {/* History Section */}
            <VStack space="md">
              <Heading size="lg" className="text-gray-800 dark:text-gray-200">Recent History</Heading>
              {historyItems.length > 0 ? (
                <Box className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                  {historyItems.map((item, index) => (
                    <React.Fragment key={item.id}>
                      <Pressable 
                        className="p-4 active:bg-gray-100 dark:active:bg-gray-700" 
                        onPress={() => handleHistoryItemPress(item.id)}
                      >
                        <VStack space="sm">
                          <Text className="text-gray-800 dark:text-gray-100 font-medium" numberOfLines={2}>
                            {item.question}
                          </Text>
                          <HStack className="justify-between items-center">
                            <Text className="text-xs text-gray-500 dark:text-gray-400">{formatDate(item.date)}</Text>
                            <Text className="text-xs text-red-600 dark:text-red-400">-{item.creditsUsed} credits</Text>
                          </HStack>
                          <HStack space="sm" className="mt-2 justify-end">
                            <Button 
                              size="xs" 
                              variant="link" 
                              onPress={() => handleExportHistoryItem(item, 'pdf')}
                              isDisabled={exportingId === item.id}
                              className="px-1 py-0 h-auto"
                            >
                              {exportingId === item.id ? <ButtonSpinner size="small" /> : <Feather name="file-text" size={14} className="text-blue-600 dark:text-blue-400" />}
                              <ButtonText className="text-blue-600 dark:text-blue-400 ml-1">PDF</ButtonText>
                            </Button>
                            <Button 
                              size="xs" 
                              variant="link" 
                              onPress={() => handleExportHistoryItem(item, 'md')}
                              isDisabled={exportingId === item.id}
                              className="px-1 py-0 h-auto"
                            >
                              {exportingId === item.id ? <ButtonSpinner size="small" /> : <Feather name="file" size={14} className="text-blue-600 dark:text-blue-400" />}
                              <ButtonText className="text-blue-600 dark:text-blue-400 ml-1">MD</ButtonText>
                            </Button>
                          </HStack>
                        </VStack>
                      </Pressable>
                      {index < historyItems.length - 1 && <Divider className="bg-gray-200 dark:bg-gray-700" />}
                    </React.Fragment>
                  ))}
                </Box>
              ) : (
                <Box className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 items-center">
                  <Text className="text-gray-500 dark:text-gray-400">You haven't solved any questions yet.</Text>
                </Box>
              )}
            </VStack>

            {/* Removed Tutorials and Features Cards */} 

            {/* Tips & Tricks Card */}
             <VStack space="md">
                <Heading size="lg" className="text-gray-800 dark:text-gray-200">Tips & Tricks</Heading>
                <Pressable onPress={() => handleCardPress('tips')}>
                  <Box className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 flex-row items-center">
                    <Feather name="zap" size={24} color="#4F46E5" className="mr-4" /> 
                    <VStack className="flex-1">
                      <Heading size="md" className="text-gray-900 dark:text-gray-100">Solver Tips</Heading>
                      <Text size="sm" className="text-gray-600 dark:text-gray-400 mt-1">Boost your solving efficiency.</Text>
                    </VStack>
                     <Feather name="chevron-right" size={20} color="#9CA3AF" /> 
                  </Box>
                </Pressable>
              </VStack>
            
          </VStack>
        </ScrollView>
      </SafeAreaView>
    </Box>
  );
}
