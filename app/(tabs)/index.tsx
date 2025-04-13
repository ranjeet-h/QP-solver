import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, ScrollView, KeyboardAvoidingView, Platform, SafeAreaView, ActivityIndicator, Share as RNShare } from 'react-native';
import { 
  Box, 
  Button, 
  ButtonText, 
  Center, 
  Heading, 
  Text, 
  VStack,
  HStack,
  Image,
  Spinner,
  Divider,
  Pressable,
  AlertDialog,
  AlertDialogBackdrop,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogCloseButton,
  AlertDialogBody,
  AlertDialogFooter,
  Icon,
  CloseIcon,
  ButtonSpinner
} from '../../components/ui';
import { useAuth } from '../_layout';
import * as DocumentPicker from 'expo-document-picker';
import Constants from 'expo-constants';
import Markdown from 'react-native-markdown-display';
import { solverService, SolverResponse } from '../../services/solver.service';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useAppToast } from '../../hooks/useAppToast';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function HomeScreen() {
  // Re-add referenceBookFile state
  const [referenceBookFile, setReferenceBookFile] = useState<DocumentPicker.DocumentPickerAsset | any>(null);
  const [questionFile, setQuestionFile] = useState<DocumentPicker.DocumentPickerAsset | any>(null);
  const [streamedAnswerContent, setStreamedAnswerContent] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [exportLoading, setExportLoading] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  
  const { userCredits, setUserCredits } = useAuth();
  const { showSuccessToast, showErrorToast } = useAppToast();

  useEffect(() => {
    return () => {
      wsRef.current?.close();
    };
  }, []);

  // Update pickReferenceBook to only accept PDF
  const pickReferenceBook = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf'], // Only allow PDF
        copyToCacheDirectory: true
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setReferenceBookFile(result.assets[0]); 
        setError('');
      }
    } catch (err) {
      console.log('Error picking reference book:', err);
      setError('Could not pick reference book.');
    }
  };

  // Update pickQuestionPaper to only accept PDF
  const pickQuestionPaper = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf'], // Only allow PDF
        copyToCacheDirectory: true
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setQuestionFile(result.assets[0]);
        setError('');
      }
    } catch (err) {
      console.log('Error picking question paper:', err);
      setError('Could not pick question paper.');
    }
  };

  // Helper function to map backend logs to user-friendly messages
  const mapBackendStatusToUI = (backendStatus: string): string | null => {
    // Use startsWith for more robust matching
    if (backendStatus.startsWith('[INFO] Connection established')) return 'Connected...';
    if (backendStatus.startsWith('[INFO] Authentication successful')) return 'Authenticated...';
    if (backendStatus.startsWith('[INFO] Received') && backendStatus.includes('bytes')) return 'Receiving file data...';
    if (backendStatus.startsWith('[INFO] File saved temporarily')) return 'File received, preparing...';
    if (backendStatus.startsWith('[INFO] Initializing PDF processing')) return 'Initializing PDF processing...';
    if (backendStatus.startsWith('[INFO] Starting text extraction')) return 'Extracting text from PDF...';
    if (backendStatus.startsWith('[INFO] Extraction complete')) return 'Text extracted, preparing solution...';
    if (backendStatus.startsWith('[INFO] Extraction took')) return 'Processing text...';
    if (backendStatus.startsWith('[INFO] Generating solutions')) return 'Generating solution...';
    if (backendStatus.startsWith('[INFO] Sending extracted PDF text to Gemini')) return 'Sending data to AI...';
    if (backendStatus.startsWith('[DEBUG] Attempting to initiate Gemini stream')) return 'Requesting solution from AI...';
    if (backendStatus.startsWith('[DEBUG] Gemini stream initiated')) return 'Receiving solution...';
    if (backendStatus.startsWith('[DEBUG] Received first chunk')) return 'Receiving first part of solution...';
    if (backendStatus.startsWith('[DEBUG] Finished iterating')) return 'Solution received...';
    if (backendStatus.startsWith('[INFO] Processing complete')) return 'Processing complete.';
    if (backendStatus.startsWith('[ERROR]')) {
      const match = backendStatus.match(/Error: (.*)/);
      return match ? `Error: ${match[1]}` : 'An error occurred';
    }
    // Return null for unmapped messages
    return null;
  };

  const handleSolveQuestionStream = async () => {
    if (!questionFile) {
      showErrorToast('No File Selected', 'Please select a question paper PDF first.');
      return;
    }

    const requiredCredits = 5; // Assuming reference book doesn't change cost for now
    if (userCredits < requiredCredits) {
      setError(`Not enough credits (need ${requiredCredits}). Please purchase more credits in Settings.`);
      return;
    }

    // Close any existing WebSocket connection first
    if (wsRef.current) {
      console.log("Closing existing WebSocket connection");
      wsRef.current.close();
      wsRef.current = null;
    }

    // Reset all state at the start of a new solution attempt
    setIsStreaming(true);
    setError('');
    setStreamedAnswerContent('');
    setStatusMessage('Connecting to solver...');
    console.log("States reset for new solution");

    // Deduct credits immediately (optimistic update)
    setUserCredits(userCredits - requiredCredits); 
    
    try {
      // Retrieve the token from storage
      const token = await AsyncStorage.getItem('userToken');
      console.log("Token retrieved:", token);
      if (!token) {
        showErrorToast('Authentication Required', 'Please log in to solve questions.');
        setIsStreaming(false);
        setUserCredits(userCredits);
        return;
      }

      // Setup new WebSocket connection
      console.log("Creating new WebSocket connection");
      wsRef.current = solverService.solveQuestionStream(
        questionFile,
        (chunk) => { // chunk callback
          // Log a snippet of the received chunk for debugging
          const snippetLength = Math.min(30, chunk.length);
          const snippetText = chunk.substring(0, snippetLength) + (chunk.length > snippetLength ? '...' : '');
          console.log(`Processing content chunk (${chunk.length} chars): ${snippetText}`);
          
          // Update the UI with the new content
          setStreamedAnswerContent(prev => {
            // Only add the initial newlines if this is the first chunk
            const newContent = prev === '' ? '\n\n\n' + chunk : prev + chunk;
            console.log(`Updated streamedAnswerContent length: ${newContent.length} chars`);
            return newContent;
          });
        },
        (statusOrEvent: any) => { // backendStatus callback
          let backendStatus: string | null = null;
          // Check if it's a string or an Event object
          if (typeof statusOrEvent === 'string') {
            backendStatus = statusOrEvent;
          } else if (statusOrEvent && typeof statusOrEvent === 'object' && 'data' in statusOrEvent) {
             // Assuming status message might be in event.data for non-string messages
             if (typeof statusOrEvent.data === 'string') {
               backendStatus = statusOrEvent.data;
             }
          }
          
          if (backendStatus) {
            const uiStatus = mapBackendStatusToUI(backendStatus);
            if (uiStatus) {
              setStatusMessage(uiStatus);
            }
            if (backendStatus.startsWith('[ERROR]')) {
              setError(uiStatus || 'An error occurred during processing.');
              setIsStreaming(false); 
              setUserCredits(userCredits); // Revert credits
            }
          } else {
            // Handle unexpected status type if necessary
            console.warn("Received unexpected status type:", statusOrEvent);
          }
        },
        (errorEvent) => { // error callback
          console.log("WebSocket Error Event:", errorEvent);
          const message = (errorEvent as any)?.message || 'Connection error';
          setError(`WebSocket connection failed: ${message}`);
          setStatusMessage('Connection failed.');
          setIsStreaming(false);
          wsRef.current = null;
          setUserCredits(userCredits); // Revert credits
        },
        (closeEvent: CloseEvent) => { // close callback
          console.log("WebSocket Closed Event:", closeEvent.code, closeEvent.reason);
          console.log("streamedAnswerContent exists:", !!streamedAnswerContent);
          console.log("streamedAnswerContent length:", streamedAnswerContent.length);
          setIsStreaming(false);
          
          // Check if connection closed cleanly BUT no content was received
          if (closeEvent.wasClean && !streamedAnswerContent) { 
            setError('Processing completed, but no solution content was received.');
            setStatusMessage('No solution found.'); // Keep status brief
            // Optional: Revert credits if no content means failure/no value
            // setUserCredits(userCredits); 
          } else if (!closeEvent.wasClean) {
            // setError('Connection closed unexpectedly.');
            // setStatusMessage('Connection closed.');
            // setUserCredits(userCredits); // Revert credits only on unclean close
          } else {
             // Clean close with content received
             setStatusMessage('Processing complete.'); 
             setError(''); // Clear any previous errors
          }
          
          wsRef.current = null;
        },
        token // Pass the retrieved token
      );

      if (!wsRef.current) {
        // This might happen if the token was missing or file URI was invalid initially
        throw new Error("Failed to establish WebSocket connection.");
      }

    } catch (error) {
      console.log("Error initiating WebSocket connection:", error);
      setError('Failed to connect to the solver service. Please try again.');
      // Revert credits on initial connection error
      setUserCredits(userCredits); 
      setIsStreaming(false);
      wsRef.current = null;
    }
  };

  const handleExport = async (format: 'pdf' | 'md') => {
    if (!streamedAnswerContent) return;
    
    setExportLoading(true);
    try {
      if (format === 'pdf') {
        const htmlContent = `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <title>Solution</title>
              <style>
                body { font-family: sans-serif; line-height: 1.6; padding: 20px; }
                pre { background: #f4f4f4; padding: 10px; border-radius: 5px; white-space: pre-wrap; word-wrap: break-word; }
                code { font-family: monospace; background: #f4f4f4; padding: 2px 4px; border-radius: 3px; }
                h1 { font-size: 2em; margin-bottom: 0.5em; }
                h2 { font-size: 1.5em; margin-bottom: 0.5em; }
                h3 { font-size: 1.17em; margin-bottom: 0.5em; }
                ul, ol { margin: 1em 0; padding-left: 2em; }
                li { margin-bottom: 0.5em; }
                blockquote { border-left: 4px solid #ccc; padding-left: 1em; margin-left: 0; color: #666; }
                table { border-collapse: collapse; width: 100%; margin-bottom: 1em; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f2f2f2; }
              </style>
            </head>
            <body>
              ${streamedAnswerContent} 
            </body>
          </html>
        `;
        
        const { uri } = await Print.printToFileAsync({ html: htmlContent, base64: false });

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Export Solution as PDF', UTI: 'com.adobe.pdf' });
        }
      } else {
        const fileUri = `${FileSystem.cacheDirectory}solution.md`;
        await FileSystem.writeAsStringAsync(fileUri, streamedAnswerContent, {
          encoding: FileSystem.EncodingType.UTF8,
        });

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri, { 
            mimeType: 'text/markdown',
            dialogTitle: 'Export Solution as Markdown',
            UTI: 'net.daringfireball.markdown'
          });
        }
      }
    } catch (error) {
      setError('Failed to export file. Please try again.');
      console.log('Export error:', error);
    } finally {
      setExportLoading(false);
    }
  };

  const clearForm = () => {
    wsRef.current?.close(); 
    wsRef.current = null;
    setReferenceBookFile(null); // Reset reference book
    setQuestionFile(null);
    setStreamedAnswerContent('');
    setIsStreaming(false);
    setError('');
    setStatusMessage('');
  };

  return (
    <Box className="bg-gray-50 dark:bg-black flex-1">
      <SafeAreaView style={{ flex: 1, paddingTop: Platform.OS === 'android' ? Constants.statusBarHeight : 0 }}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"} 
          style={{ flex: 1 }}
        >
          <HStack className="p-4 items-center justify-between border-b border-gray-200 dark:border-gray-700">
            <Heading size="lg" className="text-gray-900 dark:text-gray-100">Solver</Heading>
            <Box className="bg-blue-100 dark:bg-blue-900 px-3 py-1 rounded-full">
              <Text className="font-semibold text-blue-700 dark:text-blue-300">Credits: {userCredits ?? 'N/A'}</Text>
            </Box>
          </HStack>

          <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
            <VStack space="lg" className="p-6">
              <VStack space="md">
                <HStack space="sm" className="items-center">
                  <Heading size="md" className="text-gray-900 dark:text-gray-100">Question Paper</Heading>
                  <Text className="text-red-600 dark:text-red-400 font-bold text-lg">*</Text> 
                </HStack>
                <Pressable onPress={pickQuestionPaper} disabled={isStreaming}>
                  <Box className="border border-dashed border-gray-400 dark:border-gray-600 rounded-lg p-6 items-center justify-center bg-gray-100 dark:bg-gray-800">
                    <Feather name="upload-cloud" size={28} color="#9CA3AF" />
                    <Text className="mt-2 text-gray-600 dark:text-gray-400 text-center">
                      {questionFile ? questionFile.name : 'Tap to select PDF (Required)'}
                    </Text>
                  </Box>
                </Pressable>
              </VStack>

              <VStack space="md" className="mt-4">
                 <Heading size="md" className="text-gray-900 dark:text-gray-100">Reference Book (Optional)</Heading>
                <Pressable onPress={pickReferenceBook} disabled={isStreaming}>
                  <Box className="border border-gray-300 dark:border-gray-600 rounded-lg p-6 items-center justify-center bg-gray-200 dark:bg-gray-700">
                    <Feather name="book-open" size={28} color="#9CA3AF" />
                    <Text className="mt-2 text-gray-600 dark:text-gray-400 text-center">
                      {referenceBookFile ? referenceBookFile.name : 'Tap to select PDF'}
                    </Text>
                  </Box>
                </Pressable>
              </VStack>

              <Button 
                onPress={handleSolveQuestionStream} 
                isDisabled={!questionFile || isStreaming}
                size="lg"
                className="
                  w-full mt-4 rounded-lg px-6 h-11 flex-row items-center justify-center 
                  bg-blue-600 dark:bg-blue-500 
                  hover:bg-blue-700 dark:hover:bg-blue-400 
                  active:bg-blue-800 dark:active:bg-blue-300 
                  active:scale-95 active:brightness-90 
                  disabled:opacity-50 
                  transition duration-150 ease-in-out
                "
              >
                 {isStreaming ? <ButtonSpinner color="white" /> : <Ionicons name="sparkles-outline" size={20} color="white" />}
                <ButtonText className="font-bold text-white">
                  {isStreaming ? 'Solving...' : 'Solve Question'}
                </ButtonText>
              </Button>

              {(statusMessage && !error) && (
                <VStack space="sm" className="mt-4 items-center">
                  {isStreaming && <Spinner size="small" />}
                  {statusMessage.includes('Processing complete') ? (
                    <HStack space="xs" className="items-center bg-green-100 dark:bg-green-900 px-3 py-1 rounded-full">
                      <Feather name="check-circle" size={16} color="#10B981" />
                      <Text className="text-green-700 dark:text-green-300 font-medium">{statusMessage}</Text>
                    </HStack>
                  ) : (
                    <Text className="text-gray-600 dark:text-gray-400 text-sm">{statusMessage}</Text>
                  )}
                </VStack>
              )}

              {error && (
                <Box className="mt-4 p-3 bg-red-100 dark:bg-red-900 rounded-md">
                  <Text className="text-red-700 dark:text-red-300 font-medium">{error}</Text>
                </Box>
              )}
              
              {streamedAnswerContent && (
                <VStack space="md" className="mt-6 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
                  <HStack className="justify-between items-center">
                     <Heading size="md" className="text-gray-900 dark:text-gray-100">Solution</Heading>
                     <HStack space="sm">
                      {/* Direct export icons */}
                      <Pressable 
                        onPress={() => handleExport('pdf')} 
                        disabled={isStreaming || exportLoading}
                        className="w-8 h-8 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700"
                      >
                        {exportLoading ? 
                          <Spinner size="small" /> : 
                          <Feather name="file-text" size={16} color="#4B5563" />
                        }
                      </Pressable>
                      <Pressable 
                        onPress={() => handleExport('md')} 
                        disabled={isStreaming || exportLoading}
                        className="w-8 h-8 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700"
                      >
                        {exportLoading ? 
                          <Spinner size="small" /> : 
                          <Feather name="file" size={16} color="#4B5563" />
                        }
                      </Pressable>
                      <Button variant="outline" size="xs" action="secondary" onPress={clearForm} disabled={isStreaming || exportLoading}>
                         <Feather name="x" size={14} style={{ marginRight: 4 }}/>
                         <ButtonText>Clear</ButtonText>
                      </Button>
                     </HStack>
                  </HStack>
                  
                  <Divider className="my-2 bg-gray-200 dark:bg-gray-700" />

                  <Box className="text-gray-800 dark:text-gray-200">
                     <Markdown style={markdownStyles}>
                       {streamedAnswerContent}
                     </Markdown>
                  </Box>
                </VStack>
              )}

              {/* Debug info - REMOVE IN PRODUCTION */}
              {/* {__DEV__ && (
                <VStack space="sm" className="mt-4 p-3 bg-gray-100 dark:bg-gray-900 rounded-md">
                  <Text className="text-gray-800 dark:text-gray-200 font-bold">Debug Info:</Text>
                  <Text className="text-gray-700 dark:text-gray-300">isStreaming: {isStreaming.toString()}</Text>
                  <Text className="text-gray-700 dark:text-gray-300">Status: {statusMessage}</Text>
                  <Text className="text-gray-700 dark:text-gray-300">Error: {error || 'none'}</Text>
                  <Text className="text-gray-700 dark:text-gray-300">
                    Content: {streamedAnswerContent ? `${streamedAnswerContent.length} chars` : 'none'}
                  </Text>
                </VStack>
              )} */}

              {/* Add test toast button */}
              {/* <Button 
                variant="outline" 
                action="secondary" 
                onPress={testToastMessages} 
                style={styles.testButton}
              >
                <ButtonText>Test Toast Messages</ButtonText>
              </Button> */}
            </VStack>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Box>
  );
}

const markdownStyles = StyleSheet.create({
  body: { 
  },
  heading1: { 
    marginTop: 16,
    marginBottom: 8,
  },
  heading2: {
    marginTop: 12,
    marginBottom: 6,
  },
});

const styles = StyleSheet.create({
  testButton: {
    marginBottom: 4,
  },
});
