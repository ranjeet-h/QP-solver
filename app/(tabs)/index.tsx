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
  FormControl,
  FormControlLabel,
  FormControlLabelText,
  FormControlHelper,
  FormControlHelperText,
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
  AlertDialogFooter
} from '../../components/ui';
import { useAuth } from '../_layout';
import { AntDesign, MaterialIcons, Feather } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import Constants from 'expo-constants';
import Markdown from 'react-native-markdown-display';
import { solverService, SolverResponse } from '../../services/solver.service';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import { BlurView } from 'expo-blur';

export default function HomeScreen() {
  // Re-add and comment out referenceBookFile state
  // const [referenceBookFile, setReferenceBookFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [questionFile, setQuestionFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [streamedAnswerContent, setStreamedAnswerContent] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  
  const { userCredits, setUserCredits } = useAuth();

  useEffect(() => {
    return () => {
      wsRef.current?.close();
    };
  }, []);

  // Re-add and comment out pickReferenceBook function
  /*
  const pickReferenceBook = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        copyToCacheDirectory: true
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setReferenceBookFile(result.assets[0]); // This would need to be uncommented if the state is uncommented
        setError('');
      }
    } catch (err) {
      console.error('Error picking reference book:', err);
    }
  };
  */

  const pickQuestionPaper = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        copyToCacheDirectory: true
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setQuestionFile(result.assets[0]);
        setError('');
      }
    } catch (err) {
      console.error('Error picking question paper:', err);
    }
  };

  // Helper function to map backend logs to user-friendly messages
  const mapBackendStatusToUI = (backendStatus: string): string | null => {
    if (backendStatus.startsWith('[INFO] Connection established')) return 'Connected...';
    if (backendStatus.startsWith('[INFO] Authentication successful')) return 'Authenticated...';
    if (backendStatus.startsWith('[INFO] Received') && backendStatus.includes('bytes')) return 'Receiving file data...'; // Covers binary and base64
    if (backendStatus.startsWith('[INFO] File saved temporarily')) return 'File received, preparing...';
    if (backendStatus.startsWith('[INFO] Initializing PDF processing')) return 'Initializing PDF processing...';
    if (backendStatus.startsWith('[INFO] Starting text extraction')) return 'Extracting text from PDF...';
    if (backendStatus.startsWith('[INFO] Extraction complete')) return 'Text extracted, preparing solution...';
    if (backendStatus.startsWith('[INFO] Sending extracted PDF text to Gemini')) return 'Sending data to AI...';
    if (backendStatus.startsWith('[DEBUG] Attempting to initiate Gemini stream')) return 'Requesting solution from AI...';
    if (backendStatus.startsWith('[DEBUG] Gemini stream initiated')) return 'Receiving solution...'; // Indicates first part of solution is coming
    if (backendStatus.startsWith('[ERROR]')) {
      // Extract a cleaner error message if possible
      const match = backendStatus.match(/Error: (.*)/);
      return match ? `Error: ${match[1]}` : 'An error occurred';
    }
    // Return null if it's not a status we want to display explicitly
    return null; 
  };

  const handleSolveQuestionStream = async () => {
    // Comment out reference book check
    /*
    if (!referenceBookFile) {
      setError('Please upload a reference book');
      return;
    }
    */

    if (!questionFile) {
      setError('Please upload a question paper');
      return;
    }

    const requiredCredits = 5;
    if (userCredits < requiredCredits) {
      setError(`Not enough credits (need ${requiredCredits}). Please purchase more credits in Settings.`);
      return;
    }

    wsRef.current?.close();

    setIsStreaming(true);
    setError('');
    setStreamedAnswerContent('');
    setStatusMessage('Connecting to solver...');

    setUserCredits(userCredits - requiredCredits);
    
    try {
      wsRef.current = solverService.solveQuestionStream(
        questionFile,
        (chunk) => {
          console.log('Received Markdown Chunk:', JSON.stringify(chunk));
          setStreamedAnswerContent(prev => prev === '' ? '\n\n\n' + chunk : prev + chunk);
        },
        (backendStatus) => {
          const uiStatus = mapBackendStatusToUI(backendStatus);
          if (uiStatus) {
            setStatusMessage(uiStatus);
          }
          if (backendStatus.startsWith('[ERROR]')) {
             setError(uiStatus || 'An error occurred during processing.');
             setIsStreaming(false); 
          }
        },
        (errorEvent) => {
          console.error("WebSocket Error Event:", errorEvent);
          const message = (errorEvent as any)?.message || 'Connection error';
          setError(`WebSocket connection failed: ${message}`);
          setStatusMessage('Connection failed.');
          setIsStreaming(false);
          wsRef.current = null;
        },
        (closeEvent: CloseEvent) => {
          console.log("WebSocket Closed Event:", closeEvent.code, closeEvent.reason);
          setIsStreaming(false); 
          setStatusMessage(closeEvent.wasClean ? 'Processing complete.' : 'Connection closed.');
          wsRef.current = null;
        }
      );
    } catch (error) {
      console.error("Error initiating WebSocket connection:", error);
      setError('Failed to connect to the solver service. Please try again.');
      setUserCredits(userCredits + requiredCredits);
      setIsStreaming(false);
      wsRef.current = null;
    }
  };

  const handleExport = async (format: 'pdf' | 'docx') => {
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
            UTI: 'public.plain-text' 
          });
        }
      }
    } catch (error) {
      setError('Failed to export file. Please try again.');
      console.error('Export error:', error);
    } finally {
      setExportLoading(false);
      setShowExportDialog(false);
    }
  };

  const clearForm = () => {
    wsRef.current?.close(); // Close WebSocket connection
    wsRef.current = null;
    // setReferenceBookFile(null); // Commented out
    setQuestionFile(null);
    setStreamedAnswerContent(''); // Clear streamed content
    setError('');
    setStatusMessage('');
    setIsStreaming(false);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <Box style={styles.header}>
            <VStack style={styles.headerContent}>
              <Heading style={styles.title} className='text-2xl font-bold'>Question Solver</Heading>
              {/* <Text style={styles.subtitle}>Upload your reference book and question paper for detailed solutions</Text> */}
              <Text style={styles.subtitle}>Upload your question paper for detailed solutions</Text>
            </VStack>
            
            <HStack style={styles.creditsContainer}>
              <Image 
                source={require('../../assets/images/undraw_learning-sketchingsh.png')}
                alt="Credits"
                style={styles.creditIcon}
                defaultSource={{ uri: 'https://via.placeholder.com/24' }}
              />
              <Text style={styles.creditText}>
                {userCredits} credits
              </Text>
            </HStack>
          </Box>
          
          <Box style={styles.formContainer}>
            {/* Comment out Reference Book FormControl */}
            {/* 
            <FormControl isRequired isInvalid={!referenceBookFile && !!error}> 
              <FormControlLabel>
                <FormControlLabelText>Reference Book</FormControlLabelText>
              </FormControlLabel>
              <Pressable 
                onPress={pickReferenceBook}
                style={[styles.fileUploadContainer, !referenceBookFile && !!error && styles.errorBorder]}
              >
                {referenceBookFile ? (
                  <HStack style={styles.fileSelectedContainer}>
                    <Feather name="file-text" size={24} color="#4A5568" />
                    <VStack style={styles.fileInfoContainer}>
                      <Text numberOfLines={1} style={styles.fileName}>{referenceBookFile.name}</Text>
                      <Text style={styles.fileSize}>{(referenceBookFile.size ? (referenceBookFile.size / 1024).toFixed(2) : '0')} KB</Text>
                    </VStack>
                  </HStack>
                ) : (
                  <VStack style={styles.fileUploadContent}>
                    <Feather name="upload" size={32} color="#A0AEC0" />
                    <Text style={styles.uploadText}>Click to upload reference book</Text>
                    <Text style={styles.uploadSubtext}>PDF, DOCX, or image files</Text>
                  </VStack>
                )}
              </Pressable>
              <FormControlHelper>
                <FormControlHelperText>
                  Upload your reference book or study material
                </FormControlHelperText>
              </FormControlHelper>
            </FormControl>
            */}
            
            {/* Ensure question container doesn't have the top margin style if the reference box is commented */}
            <FormControl isRequired isInvalid={!questionFile && !!error} /* style={styles.questionContainer} - remove style or comment out */>
              <FormControlLabel>
                <FormControlLabelText>Question Paper</FormControlLabelText>
              </FormControlLabel>
              <Pressable 
                onPress={pickQuestionPaper}
                style={[styles.fileUploadContainer, !questionFile && !!error && styles.errorBorder]}
              >
                {questionFile ? (
                  <HStack style={styles.fileSelectedContainer}>
                    <Feather name="file-text" size={24} color="#4A5568" />
                    <VStack style={styles.fileInfoContainer}>
                      <Text numberOfLines={1} style={styles.fileName}>{questionFile.name}</Text>
                      <Text style={styles.fileSize}>{(questionFile.size ? (questionFile.size / 1024).toFixed(2) : '0')} KB</Text>
                    </VStack>
                  </HStack>
                ) : (
                  <VStack style={styles.fileUploadContent}>
                    <Feather name="upload" size={32} color="#A0AEC0" />
                    <Text style={styles.uploadText}>Click to upload question paper</Text>
                    <Text style={styles.uploadSubtext}>PDF, DOCX, or image files</Text>
                  </VStack>
                )}
              </Pressable>
              <FormControlHelper>
                <FormControlHelperText>
                  Upload your question paper to get solutions
                </FormControlHelperText>
              </FormControlHelper>
            </FormControl>
            
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            
            <HStack style={styles.buttonContainer}>
              <Button
                style={styles.clearButton}
                variant="outline"
                onPress={clearForm}
                // Update isDisabled logic - keep current, comment old
                // isDisabled={isStreaming || (!referenceBookFile && !questionFile && !streamedAnswerContent)}
                isDisabled={isStreaming || (!questionFile && !streamedAnswerContent)} 
              >
                <ButtonText>Clear</ButtonText>
              </Button>
              
              <Button
                style={styles.solveButton}
                onPress={handleSolveQuestionStream} // Use new handler
                // Update isDisabled logic - keep current, comment old
                // isDisabled={isStreaming || !referenceBookFile || !questionFile || userCredits < 5} 
                isDisabled={isStreaming || !questionFile || userCredits < 5} 
              >
                {isStreaming ? <Spinner /> : <ButtonText>Solve Question</ButtonText>}
              </Button>
            </HStack>

            {/* Loading Overlay - Placed inside formContainer */} 
            {isStreaming && (
              <BlurView intensity={50} tint="light" style={styles.loadingOverlay}>
                <Spinner size="large" color="#333" />
                <Text style={[styles.loadingText, { marginTop: 16 }]}>{statusMessage || 'Processing...'}</Text>
              </BlurView>
            )}
          </Box>
          
          {streamedAnswerContent ? (
            <Box style={styles.answerContainer}>
              <HStack style={styles.answerHeader}>
                <Heading size="md">Solution</Heading>
                <HStack space="sm">
                  <Text style={styles.costText}>-5 credits</Text>
                  <Button
                    size="sm"
                    variant="outline"
                    onPress={() => setShowExportDialog(true)}
                    isDisabled={isStreaming}
                  >
                    <HStack style={{ alignItems: 'center' }} space="sm">
                      <Feather name="download" size={16} color="#000" />
                      <ButtonText>Export</ButtonText>
                    </HStack>
                  </Button>
                </HStack>
              </HStack>
              <Divider style={styles.divider} />
              <Box style={styles.markdownContainer}>
                <Markdown style={markdownStyles}>{streamedAnswerContent}</Markdown>
              </Box>
            </Box>
          ) : null}
        </ScrollView>

        <AlertDialog
          isOpen={showExportDialog}
          onClose={() => setShowExportDialog(false)}
        >
          <AlertDialogBackdrop style={styles.dialogBackdrop} />
          <AlertDialogContent style={styles.dialogContent}>
            <AlertDialogHeader style={styles.dialogHeader}>
              <Heading size="lg">Export Solution</Heading>
              <AlertDialogCloseButton />
            </AlertDialogHeader>
            <AlertDialogBody style={styles.dialogBody}>
              <Text>Choose export format:</Text>
            </AlertDialogBody>
            <AlertDialogFooter style={styles.dialogFooter}>
              <Button
                variant="outline"
                onPress={() => handleExport('pdf')}
                isDisabled={exportLoading || isStreaming}
                style={styles.exportButton}
              >
                {exportLoading ? <Spinner /> : <ButtonText>PDF</ButtonText>}
              </Button>
              <Box style={{ width: 8 }} />
              <Button
                variant="solid"
                onPress={() => handleExport('docx')}
                isDisabled={exportLoading || isStreaming}
                style={styles.exportButton}
              >
                {exportLoading ? <Spinner /> : <ButtonText>Markdown</ButtonText>}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingTop: Platform.OS === 'android' ? Constants.statusBarHeight : 0,
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: 20,
    marginBottom: 20,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  subtitle: {
    opacity: 0.7,
    marginTop: 4,
  },
  creditsContainer: {
    alignItems: 'center',
    backgroundColor: 'white',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  creditIcon: {
    width: 24,
    height: 24,
  },
  creditText: {
    marginLeft: 4,
    fontWeight: '500',
  },
  formContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 20,
    position: 'relative', // Needed for absolute positioning of overlay
    overflow: 'hidden', // Clip the blur overlay to the container bounds
  },
  fileUploadContainer: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 16,
    minHeight: 120,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
  },
  fileUploadContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadText: {
    marginTop: 8,
    fontWeight: '500',
  },
  uploadSubtext: {
    fontSize: 12,
    opacity: 0.6,
    marginTop: 4,
  },
  fileSelectedContainer: {
    width: '100%',
    alignItems: 'center',
  },
  fileInfoContainer: {
    marginLeft: 8,
    flex: 1,
  },
  fileName: {
    fontWeight: '500',
  },
  fileSize: {
    fontSize: 12,
    opacity: 0.6,
  },
  errorBorder: {
    borderColor: 'red',
  },
  buttonContainer: {
    justifyContent: 'space-between',
    marginTop: 16,
  },
  clearButton: {
    flex: 1,
    marginRight: 8,
  },
  solveButton: {
    flex: 2,
  },
  errorText: {
    color: 'red',
    marginTop: 12,
    marginBottom: 4,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject, // Cover the parent (formContainer)
    backgroundColor: 'rgba(255, 255, 255, 0.7)', // Semi-transparent white fallback
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10, // Ensure it's above other form elements
  },
  loadingText: {
    // Removed marginTop here, will add it inline if needed
    opacity: 0.9, // Make text slightly more visible on blur
    textAlign: 'center',
    fontSize: 16, // Slightly larger status text
    fontWeight: '500',
    color: '#333',
  },
  markdownContainer: {
    paddingVertical: 16,
  },
  answerContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    marginTop: 20,
  },
  answerHeader: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  costText: {
    fontSize: 14,
    color: '#D32F2F',
    fontWeight: '500',
    alignSelf: 'center',
  },
  divider: {
    marginVertical: 8,
  },
  dialogBackdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  dialogContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 0,
    width: '90%',
    maxWidth: 400,
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  dialogHeader: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  dialogBody: {
    backgroundColor: '#FFFFFF',
    padding: 16,
  },
  dialogFooter: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  exportButton: {
    minWidth: 100,
  }
});

// Basic styles for react-native-markdown-display
const markdownStyles = StyleSheet.create({
  heading1: {
    fontSize: 28,
    fontWeight: 'bold', 
    marginTop: 15,
    marginBottom: 10,
    color: '#000000',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 5,
  },
  heading2: {
    fontSize: 22,
    fontWeight: 'bold', 
    marginTop: 12,
    marginBottom: 6,
    color: '#000000',
  },
  heading3: {
    fontSize: 18, 
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 4,
    color: '#000000',
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    color: '#000000',
  },
  strong: {
    fontWeight: 'bold',
    color: '#000000',
  },
  em: {
    fontStyle: 'italic',
    color: '#000000',
  },
  list_item: {
    marginVertical: 5,
  },
  code_block: {
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 4,
    marginVertical: 8,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: '#000000',
  },
  code_inline: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 3,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: '#000000',
  },
});
