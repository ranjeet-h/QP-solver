import React from 'react';
import { ScrollView, SafeAreaView, Platform } from 'react-native';
import { router } from 'expo-router';
import { 
  Box, 
  Heading, 
  Text, 
  VStack, 
  Icon, 
  Pressable, 
  HStack,
  Divider
} from '@/components/ui';
import Constants from 'expo-constants';
import { ArrowLeft } from 'lucide-react-native';

export default function SolverTipsScreen() {
  return (
    <Box className="bg-gray-100 dark:bg-black flex-1">
      <SafeAreaView style={{ flex: 1, paddingTop: Platform.OS === 'android' ? Constants.statusBarHeight : 0 }}>
        <HStack className="items-center px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <Pressable onPress={() => router.back()} className="p-2 -ml-2">
            <Icon as={ArrowLeft} size="xl" className="text-gray-700 dark:text-gray-300" />
          </Pressable>
          <Heading size="lg" className="ml-2 text-gray-900 dark:text-gray-100">Solver Tips</Heading>
        </HStack>

        <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
          <VStack space="lg" className="p-4">
            <Text className="text-base text-gray-700 dark:text-gray-300">
              Get better answers from the AI solver by writing clearer and more effective prompts. Here are some tips:
            </Text>

            <TipItem 
              title="1. Be Specific & Clear"
              content='Avoid vague questions. Clearly state what you need, like "List 5 key factors..." or "Summarize in 3 sentences."'
            />
            <TipItem 
              title="2. Provide Context"
              content={'Explain the background. Why are you asking? How will the answer be used? Example: "I\'m studying for a test on X, explain Y."'}
            />
            <TipItem 
              title="3. Define the Audience"
              content={'Specify who the answer is for. Example: "Explain quantum physics like I\'m 11 years old."'}
            />
             <TipItem 
              title="4. Break Down Complex Questions"
              content="If a question has multiple parts, ask about each part separately in order."
            />
             <TipItem 
              title="5. Use Examples (Few-Shot)"
              content="Show the AI the kind of answer you want by giving 1-2 examples first."
            />
             <TipItem 
              title="6. Specify the Format"
              content='Ask for the output format you need, like "list in bullet points", "provide JSON", or "write a paragraph."' 
            />

            <Heading size="md" className="mt-4 mb-2 text-gray-800 dark:text-gray-200">CO-STAR Framework</Heading>
            <Text className="text-base text-gray-700 dark:text-gray-300 mb-2">
              Consider these elements when writing your prompt:
            </Text>
            <VStack space="sm" className="pl-4">
              <Text className="text-base text-gray-700 dark:text-gray-300"><Text className="font-bold">C</Text>ontext: Background info.</Text>
              <Text className="text-base text-gray-700 dark:text-gray-300"><Text className="font-bold">O</Text>bjective: The task for the AI.</Text>
              <Text className="text-base text-gray-700 dark:text-gray-300"><Text className="font-bold">S</Text>tyle: Writing style (formal, casual).</Text>
              <Text className="text-base text-gray-700 dark:text-gray-300"><Text className="font-bold">T</Text>one: Attitude (helpful, critical).</Text>
              <Text className="text-base text-gray-700 dark:text-gray-300"><Text className="font-bold">A</Text>udience: Who is the answer for?</Text>
              <Text className="text-base text-gray-700 dark:text-gray-300"><Text className="font-bold">R</Text>esponse Format: Output look (list, paragraph).</Text>
            </VStack>
            
          </VStack>
        </ScrollView>
      </SafeAreaView>
    </Box>
  );
}

const TipItem = ({ title, content }: { title: string, content: string }) => (
  <VStack space="xs">
    <Heading size="md" className="text-gray-800 dark:text-gray-200">{title}</Heading>
    <Text className="text-base text-gray-700 dark:text-gray-300">{content}</Text>
    <Divider className="my-2 bg-gray-200 dark:bg-gray-700"/>
  </VStack>
); 