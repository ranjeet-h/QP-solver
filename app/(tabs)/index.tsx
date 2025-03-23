import React, { useState } from 'react';
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

export default function HomeScreen() {
  const [referenceBookFile, setReferenceBookFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [questionFile, setQuestionFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [answer, setAnswer] = useState<SolverResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [creditsCost, setCreditsCost] = useState<number | null>(null);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  
  // Use credits from auth context
  const { userCredits, setUserCredits } = useAuth();

  const pickReferenceBook = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        copyToCacheDirectory: true
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setReferenceBookFile(result.assets[0]);
        setError('');
      }
    } catch (err) {
      console.error('Error picking reference book:', err);
    }
  };

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

  const handleSolveQuestion = async () => {
    if (!referenceBookFile) {
      setError('Please upload a reference book');
      return;
    }

    if (!questionFile) {
      setError('Please upload a question paper');
      return;
    }

    if (userCredits < 5) {
      setError('Not enough credits. Please purchase more credits in Settings.');
      return;
    }

    setIsLoading(true);
    setError('');
    setAnswer(null);

    try {
      const response = await solverService.solveQuestion(questionFile, referenceBookFile);
      setAnswer(response);
      
      if (typeof response.remainingCredits === 'number') {
        setUserCredits(response.remainingCredits);
      }
    } catch (error) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async (format: 'pdf' | 'docx') => {
    if (!answer?.answer) return;
    
    setExportLoading(true);
    try {
      if (format === 'pdf') {
        // Convert markdown to HTML for PDF
        const htmlContent = `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <title>Solution</title>
              <style>
                body { 
                  font-family: Arial, sans-serif; 
                  line-height: 1.6; 
                  padding: 20px;
                  color: #333;
                  max-width: 800px;
                  margin: 0 auto;
                }
                h1 { color: #2C5282; margin-bottom: 20px; }
                h2 { color: #2B6CB0; margin-top: 30px; }
                code { 
                  background: #f4f4f4; 
                  padding: 2px 5px; 
                  border-radius: 3px;
                  font-family: monospace;
                }
                pre { 
                  background: #f4f4f4; 
                  padding: 15px; 
                  border-radius: 5px;
                  overflow-x: auto;
                  white-space: pre-wrap;
                }
                ul, ol { margin: 10px 0; padding-left: 20px; }
                li { margin: 5px 0; }
                @media print {
                  body { 
                    padding: 0;
                    font-size: 12pt;
                  }
                  pre, code {
                    font-size: 10pt;
                  }
                }
              </style>
            </head>
            <body>
              ${answer.answer}
            </body>
          </html>
        `;

        // Generate PDF using expo-print
        const { uri } = await Print.printToFileAsync({
          html: htmlContent,
          base64: false
        });

        // Share the PDF
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, {
            mimeType: 'application/pdf',
            dialogTitle: 'Export Solution as PDF',
            UTI: 'com.adobe.pdf'
          });
        }
      } else {
        // For DOCX, save as markdown
        const fileUri = `${FileSystem.cacheDirectory}solution.md`;
        await FileSystem.writeAsStringAsync(fileUri, answer.answer, {
          encoding: FileSystem.EncodingType.UTF8,
        });

        // Share the markdown file
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri, {
            mimeType: 'text/markdown',
            dialogTitle: 'Export Solution as DOCX',
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
    setReferenceBookFile(null);
    setQuestionFile(null);
    setAnswer(null);
    setError('');
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
              <Text style={styles.subtitle}>Upload your reference book and question paper for detailed solutions</Text>
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
            
            <FormControl isRequired isInvalid={!questionFile && !!error} style={styles.questionContainer}>
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
                isDisabled={isLoading || (!referenceBookFile && !questionFile)}
              >
                <ButtonText>Clear</ButtonText>
              </Button>
              
              <Button
                style={styles.solveButton}
                onPress={handleSolveQuestion}
                isDisabled={isLoading || !referenceBookFile || !questionFile || userCredits < 5}
              >
                {isLoading ? <Spinner /> : <ButtonText>Solve Question</ButtonText>}
              </Button>
            </HStack>
          </Box>
          
          {isLoading && (
            <Center style={styles.loadingContainer}>
              <Spinner size="large" />
              <Text style={styles.loadingText}>Analyzing documents and generating solution...</Text>
            </Center>
          )}
          
          {answer && (
            <Box style={styles.answerContainer}>
              <HStack style={styles.answerHeader}>
                <Heading size="md">Solution</Heading>
                <HStack space="sm">
                  <Text style={styles.costText}>-{answer.creditsUsed} credits</Text>
                  <Button
                    size="sm"
                    variant="outline"
                    onPress={() => setShowExportDialog(true)}
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
                <Markdown>{answer.answer}</Markdown>
              </Box>
            </Box>
          )}
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
                isDisabled={exportLoading}
                style={styles.exportButton}
              >
                {exportLoading ? <Spinner /> : <ButtonText>PDF</ButtonText>}
              </Button>
              <Box style={{ width: 8 }} />
              <Button
                variant="solid"
                onPress={() => handleExport('docx')}
                isDisabled={exportLoading}
                style={styles.exportButton}
              >
                {exportLoading ? <Spinner /> : <ButtonText>DOCX</ButtonText>}
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
  questionContainer: {
    marginTop: 16,
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
  loadingContainer: {
    padding: 32,
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 20,
  },
  loadingText: {
    marginTop: 16,
    opacity: 0.7,
    textAlign: 'center',
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
    backgroundColor: 'rgba(0, 0, 0, 0.6)', // Darker semi-transparent black
  },
  dialogContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 0, // Remove padding as it will be handled by child components
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
