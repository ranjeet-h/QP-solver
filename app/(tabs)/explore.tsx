import React from 'react';
import { StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { 
  Box, 
  Heading, 
  Text, 
  VStack,
  HStack,
  Divider,
  Icon
} from '@/components/ui';

// Mock history data
const historyItems = [
  {
    id: '1',
    question: 'What is the difference between mitosis and meiosis?',
    date: '2023-05-15T14:30:00',
    creditsUsed: 5,
  },
  {
    id: '2',
    question: 'Solve the quadratic equation: 3x² + 8x - 16 = 0',
    date: '2023-05-14T09:45:00',
    creditsUsed: 5,
  },
  {
    id: '3',
    question: 'Explain the process of photosynthesis and its importance.',
    date: '2023-05-10T16:20:00',
    creditsUsed: 5,
  },
  {
    id: '4',
    question: 'What are the causes and effects of the Industrial Revolution?',
    date: '2023-05-05T11:15:00',
    creditsUsed: 5,
  },
];

export default function HistoryScreen() {
  // Format the date string
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleHistoryItemPress = (id: string) => {
    // In a real app, this would navigate to the detailed answer
    console.log(`Viewing history item ${id}`);
  };

  return (
    <Box style={styles.container}>
      <Box style={styles.header}>
        <Heading style={styles.title} className='text-2xl font-bold mt-10'>History</Heading>
        <Text style={styles.subtitle}>Your previously solved questions</Text>
      </Box>
      
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {historyItems.length > 0 ? (
          <VStack style={styles.historyList}>
            {historyItems.map((item, index) => (
              <React.Fragment key={item.id}>
                <TouchableOpacity 
                  style={styles.historyItem}
                  onPress={() => handleHistoryItemPress(item.id)}
                >
                  <VStack style={styles.historyContent}>
                    <Text style={styles.question} numberOfLines={2}>
                      {item.question}
                    </Text>
                    <HStack style={styles.historyMeta}>
                      <Text style={styles.date}>{formatDate(item.date)}</Text>
                      <Text style={styles.credits}>-{item.creditsUsed} credits</Text>
                    </HStack>
                  </VStack>
                </TouchableOpacity>
                {index < historyItems.length - 1 && <Divider style={styles.divider} />}
              </React.Fragment>
            ))}
          </VStack>
        ) : (
          <Box style={styles.emptyState}>
            <Text style={styles.emptyText}>You haven't solved any questions yet.</Text>
          </Box>
        )}
      </ScrollView>
    </Box>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    paddingTop: 80,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  subtitle: {
    opacity: 0.7,
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  historyList: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  historyItem: {
    paddingVertical: 12,
  },
  historyContent: {
    gap: 8,
  },
  question: {
    fontSize: 16,
    fontWeight: '500',
  },
  historyMeta: {
    justifyContent: 'space-between',
  },
  date: {
    fontSize: 12,
    opacity: 0.6,
  },
  credits: {
    fontSize: 12,
    color: '#e53e3e',
  },
  divider: {
    marginVertical: 4,
  },
  emptyState: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  emptyText: {
    opacity: 0.7,
    textAlign: 'center',
  }
});
