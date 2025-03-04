import React, { useState } from 'react';
import { StyleSheet, ScrollView, KeyboardAvoidingView, Platform, SafeAreaView } from 'react-native';
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
  Pressable
} from '../../components/ui';
import { mockSolveQuestion } from '../../utils/mockApis';
import { useAuth } from '../_layout';
import { AntDesign, MaterialIcons, Feather } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import Constants from 'expo-constants';

export default function HomeScreen() {
  const [referenceBookFile, setReferenceBookFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [questionFile, setQuestionFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [answer, setAnswer] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [creditsCost, setCreditsCost] = useState<number | null>(null);
  
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

    // Check if user has enough credits
    if (userCredits < 5) {
      setError('Not enough credits. Please purchase more credits in Settings.');
      return;
    }

    setIsLoading(true);
    setError('');
    setAnswer('');

    try {
      // In a real app, we would upload the files to a server
      // For now, just use the file names in the mock API
      const response = await mockSolveQuestion(
        questionFile.name, 
        referenceBookFile.name
      );
      
      if (response.success) {
        setAnswer(response.answer || '');
        setCreditsCost(response.creditsUsed || null);
        // Update credits in auth context
        if (typeof response.remainingCredits === 'number') {
          setUserCredits(response.remainingCredits);
        }
      } else {
        setError(response.message || 'Failed to solve question');
      }
    } catch (error) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const clearForm = () => {
    setReferenceBookFile(null);
    setQuestionFile(null);
    setAnswer('');
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
                source={require('../../assets/images/icon.png')}
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
          
          {answer && (
            <Box style={styles.answerContainer}>
              <HStack style={styles.answerHeader}>
                <Heading size="md">Solution</Heading>
                {creditsCost !== null && (
                  <Text style={styles.costText}>-{creditsCost} credits</Text>
                )}
              </HStack>
              <Divider style={styles.divider} />
              <Text style={styles.answerText}>{answer}</Text>
            </Box>
          )}
        </ScrollView>
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
  },
  divider: {
    marginVertical: 8,
  },
  answerText: {
    lineHeight: 22,
  },
});
