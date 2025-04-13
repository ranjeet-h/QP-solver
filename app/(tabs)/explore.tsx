import React, { useState, useCallback } from 'react';
import { StyleSheet, ScrollView, SafeAreaView, Platform, Alert, ActivityIndicator } from 'react-native';
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
import { router, useFocusEffect } from 'expo-router';
import { solverService } from '@/services/solver.service'; // Import the service
import { HistoryListItem } from '@/types/api'; // Import the type

// Remove mock history data
// const historyItems = [...] 

// Simplified reusable export function (define within component for now)
const exportContentAsFile = async (content: string, format: 'pdf' | 'md', baseFilename: string) => {
  if (!content) return { success: false, message: 'No content to export' };
  
  try {
    if (format === 'pdf') {
      // Basic HTML structure for PDF
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>Solution Export</title>
          <style>
            body { font-family: sans-serif; padding: 20px; }
            h1, h2, h3 { color: #333; }
            code { background-color: #f4f4f4; padding: 2px 4px; border-radius: 3px; }
            pre { background-color: #f4f4f4; padding: 10px; border-radius: 5px; overflow-x: auto; }
            /* Add more styles as needed */
          </style>
        </head>
        <body>
          ${content} 
        </body>
        </html>
      `;
      const { uri } = await Print.printToFileAsync({ html: htmlContent, base64: false });
      const pdfFilename = `${baseFilename}.pdf`;
      const newPdfUri = `${FileSystem.cacheDirectory}${pdfFilename}`;
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
    console.log('Export error:', error);
    return { success: false, message: error.message || 'Failed to export file.' };
  }
};

// Helper function to clean markdown prefixes from titles
const cleanTitle = (rawTitle: string): string => {
  // Remove common markdown prefixes and trim
  return rawTitle
    .replace(/^```markdown\s*#?\s*/, '') // Remove ```markdown # (optional #)
    .replace(/^#\s+/, '') // Remove leading # followed by space
    .trim();
};

export default function ExploreScreen() {
  const [exportingId, setExportingId] = useState<number | null>(null);
  const [historyItems, setHistoryItems] = useState<any>([]); // Use correct type
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Define loadHistory using useCallback
  const loadHistory = useCallback(async () => {
    console.log("Attempting to load history...");
    // Keep existing items while refreshing unless it's the very first load
    if (historyItems.length === 0) {
      setIsLoading(true);
    } else {
      // Indicate loading subtly for refresh, maybe on the button?
      // We set isLoading=true here to disable the button spinner.
      setIsLoading(true);
    }
    setError(null);
    try {
      const history = await solverService.getHistoryList();
      console.log('History data fetched:', history);
      setHistoryItems(history || []); // Correctly access response.history
    } catch (err: any) {
      console.error("Failed to fetch history:", err);
      setError(err.message || "Failed to load history. Please try again.");
      // Keep stale data on refresh failure?
      // setHistoryItems([]); // Optionally clear items on error
    } finally {
      setIsLoading(false);
    }
  }, [historyItems.length]); // Re-create callback if historyItems length changes (for initial load logic)

  // Fetch history data when the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadHistory(); // Call the memoized function
    }, [loadHistory]) // Depend on the memoized loadHistory
  );

  // Restore formatDate helper - adjust if date format from API is different
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  // Update handleHistoryItemPress to use number ID
  const handleHistoryItemPress = (id: number) => {
    console.log(`Navigate to history item ${id} details...`);
    // Example: router.push(`/history/${id}`); // Pass ID to detail screen
  };

  const handleCardPress = (contentType: string) => {
    console.log(`Navigate to ${contentType} content...`);
    if (contentType === 'tips') {
      router.push('/solver-tips');
    }
  };

  // Update handler for exporting a specific history item
  const handleExportHistoryItem = async (itemId: number, title: string, format: 'pdf' | 'md') => {
    setExportingId(itemId); // Show loading state for this item
    setError(null); // Clear previous errors
    try {
      // Fetch the full details first
      const detailData = await solverService.getHistoryDetail(itemId);
      const fullResult = detailData.result; // Access the result from detail response
      
      if (!fullResult) {
        throw new Error('No content available for export.');
      }
      
      const baseFilename = title.substring(0, 20).replace(/\s+/g, '_') || `solution_${itemId}`;
      const result = await exportContentAsFile(fullResult, format, baseFilename);

      if (!result.success) {
        Alert.alert('Export Failed', result.message || 'Could not export the file.');
      }
    } catch (err: any) {
      console.log('Export Error (fetching details or exporting):', err);
      setError(err.message || 'Failed to get item details for export.');
      Alert.alert('Export Error', err.message || 'Failed to get item details for export.');
    } finally {
      setExportingId(null); // Hide loading state
    }
  };

  // --- Render Logic ---
  const renderContent = () => {
    // Show initial loading screen only if loading AND no items are loaded yet
    if (isLoading && historyItems.length === 0) {
      return (
        <Box className="flex-1 justify-center items-center p-6">
          <ActivityIndicator size="large" />
          <Text className="mt-2 text-gray-500 dark:text-gray-400">Loading History...</Text>
        </Box>
      );
    }

    // Show full screen error only if error occurred AND no items are loaded yet
    if (error && historyItems.length === 0) { 
      return (
        <Box className="flex-1 justify-center items-center p-6 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg m-4">
          <Feather name="alert-triangle" size={24} color="#DC2626" />
          <Text className="mt-2 text-red-700 dark:text-red-300 text-center">{error}</Text>
          <Button size="sm" variant="link" onPress={loadHistory} className="mt-4">
            <ButtonText>Retry</ButtonText>
          </Button>
        </Box>
      );
    }

    // Main content display (list, empty state, tips)
    return (
      <VStack space="lg">
        {/* History Section */}
        <VStack space="md">
          <HStack className="justify-between items-center mb-2"> {/* Added margin bottom */}
            <Heading size="lg" className="text-gray-800 dark:text-gray-200">Recent History</Heading>
            <Button 
              size="sm" 
              variant="outline" 
              onPress={loadHistory} 
              isDisabled={isLoading} // Disable while any loading is happening
              className="border-blue-900 dark:border-blue-400"
            >
              {/* Show spinner only when loading initiated by this button? 
                  Or simply show spinner whenever isLoading is true? 
                  Current: show spinner whenever isLoading is true */}
              {isLoading ? <ButtonSpinner /> : <Feather name="refresh-cw" size={14} className="text-blue-900 dark:text-blue-400"/>}
              <ButtonText className="ml-2 text-blue-900 dark:text-blue-400">Refresh</ButtonText>
            </Button>
          </HStack>
          
          {/* Display History List */} 
          {historyItems.length > 0 && (
            <Box className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
              {historyItems.map((item: HistoryListItem, index: number) => (
                <React.Fragment key={item.id}>
                  <Pressable 
                    className="p-4 active:bg-gray-100 dark:active:bg-gray-700" 
                    onPress={() => handleHistoryItemPress(item.id)}
                  >
                    <VStack space="sm">
                      <Text className="text-gray-800 dark:text-gray-100 font-medium" numberOfLines={2}>
                        {cleanTitle(item.title)} {/* Use cleaned title */}
                      </Text>
                      <HStack className="justify-between items-center">
                        <Text className="text-xs text-gray-500 dark:text-gray-400">{formatDate(item.created_at)}</Text>
                      </HStack>
                      <HStack space="sm" className="mt-2 justify-end">
                        <Button 
                          size="xs" 
                          variant="link" 
                          onPress={() => handleExportHistoryItem(item.id, item.title, 'pdf')}
                          isDisabled={exportingId === item.id}
                          className="px-1 py-0 h-auto"
                        >
                          {exportingId === item.id ? <ButtonSpinner size="small" /> : <Feather name="file-text" size={14} className="text-blue-600 dark:text-blue-400" />}
                          <ButtonText className="text-blue-600 dark:text-blue-400 ml-1">PDF</ButtonText>
                        </Button>
                        <Button 
                          size="xs" 
                          variant="link" 
                          onPress={() => handleExportHistoryItem(item.id, item.title, 'md')}
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
          )}

          {/* Empty State (only show if not initial loading and no items) */} 
          {!isLoading && historyItems.length === 0 && (
            <Box className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 items-center">
              <Text className="text-gray-500 dark:text-gray-400">You haven't solved any questions yet.</Text>
              {/* Display error message here if there was an error but list is empty */}
              {error && <Text className="mt-2 text-red-600 dark:text-red-400 text-center">Error: {error}</Text>}
            </Box>
          )}
        </VStack>

        {/* Tips & Tricks Card (Keep as is) */} 
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
    );
  };

  return (
    <Box className="bg-gray-50 dark:bg-black flex-1">
      <SafeAreaView style={{ flex: 1, paddingTop: Platform.OS === 'android' ? Constants.statusBarHeight : 0 }}>
        {/* Header (Keep as is) */} 
        <Box className="px-4 pt-4 pb-2 border-b border-gray-200 dark:border-gray-700">
          <Heading size="xl" className="text-gray-900 dark:text-gray-100">History & Tips</Heading>
           <Text size="sm" className="text-gray-600 dark:text-gray-400 mt-1">
             Review past solves and discover helpful tricks.
           </Text>
        </Box>
        
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          {renderContent()}
        </ScrollView>
      </SafeAreaView>
    </Box>
  );
}
