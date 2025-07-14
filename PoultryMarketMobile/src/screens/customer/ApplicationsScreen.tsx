import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Alert } from 'react-native';
import { styled } from 'nativewind';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { apiService } from '../../services/api';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledScrollView = styled(ScrollView);
const StyledSafeAreaView = styled(SafeAreaView);

interface ApplicationsScreenProps {
  navigation: any;
}

export const ApplicationsScreen: React.FC<ApplicationsScreenProps> = ({ navigation }) => {
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    requestedRole: 'SELLER',
    businessName: '',
    businessType: '',
    description: '',
  });

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const response = await apiService.getApplications();
      setApplications(response.applications);
    } catch (error: any) {
      console.error('Failed to fetch applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.businessName.trim() || !formData.businessType.trim() || !formData.description.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    try {
      await apiService.createApplication(formData);
      Alert.alert('Success', 'Application submitted successfully!');
      setShowForm(false);
      setFormData({
        requestedRole: 'SELLER',
        businessName: '',
        businessType: '',
        description: '',
      });
      fetchApplications();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to submit application');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'warning';
      case 'APPROVED': return 'success';
      case 'REJECTED': return 'error';
      default: return 'default';
    }
  };

  const roleOptions = [
    { label: 'Seller - Sell eggs & meat', value: 'SELLER' },
    { label: 'Company - Sell feeds & chicks', value: 'COMPANY' },
    { label: 'Stakeholder - Investment partner', value: 'STAKEHOLDER' },
  ];

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <StyledSafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <StyledView className="bg-white px-4 py-3 border-b border-gray-200">
        <StyledView className="flex-row justify-between items-center">
          <StyledText className="text-xl font-bold text-gray-900">
            Role Applications
          </StyledText>
          <Button
            title="New Application"
            size="sm"
            onPress={() => setShowForm(true)}
          />
        </StyledView>
      </StyledView>

      <StyledScrollView className="flex-1 p-4">
        {/* Applications List */}
        {applications.length === 0 ? (
          <Card>
            <CardContent className="p-8">
              <StyledView className="items-center">
                <Ionicons name="document-text" size={64} color="#9ca3af" />
                <StyledText className="text-gray-500 text-lg text-center mt-4">
                  No applications yet
                </StyledText>
                <StyledText className="text-gray-400 text-center mt-2 mb-6">
                  Submit your first application to get started
                </StyledText>
                <Button
                  title="Create Application"
                  onPress={() => setShowForm(true)}
                />
              </StyledView>
            </CardContent>
          </Card>
        ) : (
          applications.map((application) => (
            <Card key={application.id} className="mb-4">
              <CardHeader>
                <StyledView className="flex-row justify-between items-start">
                  <StyledView>
                    <StyledText className="text-lg font-semibold">
                      {application.requestedRole} Application
                    </StyledText>
                    <StyledText className="text-sm text-gray-600">
                      {application.businessName} • {application.businessType}
                    </StyledText>
                    <StyledText className="text-xs text-gray-400">
                      Submitted {new Date(application.createdAt).toLocaleDateString()}
                    </StyledText>
                  </StyledView>
                  <Badge variant={getStatusColor(application.status)}>
                    {application.status}
                  </Badge>
                </StyledView>
              </CardHeader>
              
              <CardContent>
                {application.description && (
                  <StyledView className="mb-4">
                    <StyledText className="text-gray-600">
                      {application.description}
                    </StyledText>
                  </StyledView>
                )}
                
                {application.reviewNotes && (
                  <StyledView className="bg-gray-50 p-3 rounded-lg">
                    <StyledText className="font-medium text-gray-700 mb-1">
                      Review Notes:
                    </StyledText>
                    <StyledText className="text-gray-600">
                      {application.reviewNotes}
                    </StyledText>
                  </StyledView>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </StyledScrollView>

      {/* Application Form Modal */}
      {showForm && (
        <StyledView className="absolute inset-0 bg-black bg-opacity-50 justify-center items-center p-4">
          <Card className="w-full max-w-md max-h-5/6">
            <CardHeader>
              <StyledView className="flex-row justify-between items-center">
                <StyledText className="text-lg font-semibold">
                  Submit Application
                </StyledText>
                <Button
                  title=""
                  variant="ghost"
                  size="sm"
                  onPress={() => setShowForm(false)}
                >
                  <Ionicons name="close" size={24} color="#374151" />
                </Button>
              </StyledView>
            </CardHeader>
            
            <CardContent>
              <StyledScrollView className="max-h-96">
                <StyledView className="space-y-4">
                  <StyledView>
                    <StyledText className="text-sm font-medium text-gray-700 mb-2">
                      Requested Role
                    </StyledText>
                    <StyledView className="border border-gray-300 rounded-lg">
                      <Picker
                        selectedValue={formData.requestedRole}
                        onValueChange={(value) => setFormData({ ...formData, requestedRole: value })}
                        style={{ height: 50 }}
                      >
                        {roleOptions.map((option) => (
                          <Picker.Item
                            key={option.value}
                            label={option.label}
                            value={option.value}
                          />
                        ))}
                      </Picker>
                    </StyledView>
                  </StyledView>

                  <Input
                    label="Business Name"
                    placeholder="Enter your business name"
                    value={formData.businessName}
                    onChangeText={(value) => setFormData({ ...formData, businessName: value })}
                  />

                  <Input
                    label="Business Type"
                    placeholder="e.g., Small Farm, Large Scale Operation"
                    value={formData.businessType}
                    onChangeText={(value) => setFormData({ ...formData, businessType: value })}
                  />

                  <Input
                    label="Description"
                    placeholder="Describe your business and why you want this role..."
                    value={formData.description}
                    onChangeText={(value) => setFormData({ ...formData, description: value })}
                    multiline
                    numberOfLines={4}
                  />

                  <StyledView className="flex-row space-x-2 pt-4">
                    <Button
                      title="Submit"
                      onPress={handleSubmit}
                      loading={submitting}
                      className="flex-1"
                    />
                    <Button
                      title="Cancel"
                      variant="outline"
                      onPress={() => setShowForm(false)}
                      className="flex-1"
                    />
                  </StyledView>
                </StyledView>
              </StyledScrollView>
            </CardContent>
          </Card>
        </StyledView>
      )}
    </StyledSafeAreaView>
  );
};