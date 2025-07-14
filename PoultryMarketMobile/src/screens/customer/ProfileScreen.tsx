import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Alert } from 'react-native';
import { styled } from 'nativewind';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../stores/authStore';
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

interface ProfileScreenProps {
  navigation: any;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ navigation }) => {
  const { user, logout } = useAuthStore();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    bio: '',
    location: '',
    website: '',
    avatar: '',
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const profileData = await apiService.getProfile();
      setProfile(profileData);
      setFormData({
        name: profileData.name || '',
        phone: profileData.phone || '',
        bio: profileData.bio || '',
        location: profileData.location || '',
        website: profileData.website || '',
        avatar: profileData.avatar || '',
      });
    } catch (error: any) {
      console.error('Failed to fetch profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updatedProfile = await apiService.updateProfile(formData);
      setProfile(updatedProfile);
      setIsEditing(false);
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: logout },
      ]
    );
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <StyledSafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <StyledView className="bg-white px-4 py-3 border-b border-gray-200">
        <StyledView className="flex-row justify-between items-center">
          <StyledText className="text-xl font-bold text-gray-900">
            Profile
          </StyledText>
          {!isEditing && (
            <Button
              title="Edit"
              size="sm"
              onPress={() => setIsEditing(true)}
            />
          )}
        </StyledView>
      </StyledView>

      <StyledScrollView className="flex-1 p-4">
        {/* Profile Info */}
        <Card className="mb-4">
          <CardHeader>
            <StyledView className="items-center">
              <StyledView className="w-20 h-20 bg-primary-100 rounded-full justify-center items-center mb-3">
                <StyledText className="text-2xl font-bold text-primary-600">
                  {profile?.name?.charAt(0)?.toUpperCase() || 'U'}
                </StyledText>
              </StyledView>
              <StyledText className="text-xl font-bold text-gray-900">
                {profile?.name}
              </StyledText>
              <Badge variant="info" className="mt-2">
                {profile?.role}
              </Badge>
            </StyledView>
          </CardHeader>
          
          <CardContent>
            {isEditing ? (
              <StyledView className="space-y-4">
                <Input
                  label="Full Name"
                  value={formData.name}
                  onChangeText={(value) => setFormData({ ...formData, name: value })}
                />

                <Input
                  label="Phone Number"
                  value={formData.phone}
                  onChangeText={(value) => setFormData({ ...formData, phone: value })}
                  keyboardType="phone-pad"
                />

                <Input
                  label="Location"
                  value={formData.location}
                  onChangeText={(value) => setFormData({ ...formData, location: value })}
                />

                <Input
                  label="Website"
                  value={formData.website}
                  onChangeText={(value) => setFormData({ ...formData, website: value })}
                  keyboardType="url"
                />

                <Input
                  label="Bio"
                  value={formData.bio}
                  onChangeText={(value) => setFormData({ ...formData, bio: value })}
                  multiline
                  numberOfLines={3}
                />

                <StyledView className="flex-row space-x-2 pt-4">
                  <Button
                    title="Save"
                    onPress={handleSave}
                    loading={saving}
                    className="flex-1"
                  />
                  <Button
                    title="Cancel"
                    variant="outline"
                    onPress={() => setIsEditing(false)}
                    className="flex-1"
                  />
                </StyledView>
              </StyledView>
            ) : (
              <StyledView className="space-y-4">
                <StyledView className="flex-row items-center">
                  <Ionicons name="mail" size={20} color="#6b7280" />
                  <StyledText className="ml-3 text-gray-700">{profile?.email}</StyledText>
                </StyledView>

                {profile?.phone && (
                  <StyledView className="flex-row items-center">
                    <Ionicons name="call" size={20} color="#6b7280" />
                    <StyledText className="ml-3 text-gray-700">{profile.phone}</StyledText>
                  </StyledView>
                )}

                {profile?.location && (
                  <StyledView className="flex-row items-center">
                    <Ionicons name="location" size={20} color="#6b7280" />
                    <StyledText className="ml-3 text-gray-700">{profile.location}</StyledText>
                  </StyledView>
                )}

                {profile?.website && (
                  <StyledView className="flex-row items-center">
                    <Ionicons name="globe" size={20} color="#6b7280" />
                    <StyledText className="ml-3 text-blue-600">{profile.website}</StyledText>
                  </StyledView>
                )}

                <StyledView className="flex-row items-center">
                  <Ionicons name="calendar" size={20} color="#6b7280" />
                  <StyledText className="ml-3 text-gray-700">
                    Member since {new Date(profile?.createdAt).toLocaleDateString()}
                  </StyledText>
                </StyledView>

                {profile?.bio && (
                  <StyledView className="pt-4 border-t border-gray-200">
                    <StyledText className="text-gray-700">{profile.bio}</StyledText>
                  </StyledView>
                )}
              </StyledView>
            )}
          </CardContent>
        </Card>

        {/* Account Settings */}
        <Card className="mb-4">
          <CardHeader>
            <StyledText className="text-lg font-semibold">Account Settings</StyledText>
          </CardHeader>
          <CardContent>
            <StyledView className="space-y-4">
              <StyledView className="flex-row justify-between items-center">
                <StyledView>
                  <StyledText className="font-medium">Email Verification</StyledText>
                  <StyledText className="text-sm text-gray-600">
                    Your email verification status
                  </StyledText>
                </StyledView>
                <Badge variant={profile?.isVerified ? 'success' : 'error'}>
                  {profile?.isVerified ? 'Verified' : 'Unverified'}
                </Badge>
              </StyledView>

              <StyledView className="flex-row justify-between items-center">
                <StyledView>
                  <StyledText className="font-medium">Account Type</StyledText>
                  <StyledText className="text-sm text-gray-600">
                    Your current role and permissions
                  </StyledText>
                </StyledView>
                <Badge variant="info">
                  {profile?.role}
                </Badge>
              </StyledView>
            </StyledView>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="mb-4">
          <CardHeader>
            <StyledText className="text-lg font-semibold">Quick Actions</StyledText>
          </CardHeader>
          <CardContent>
            <StyledView className="space-y-3">
              <Button
                title="My Orders"
                variant="outline"
                onPress={() => navigation.navigate('Orders')}
                className="w-full"
              />
              <Button
                title="Role Applications"
                variant="outline"
                onPress={() => navigation.navigate('Applications')}
                className="w-full"
              />
              <Button
                title="Logout"
                variant="outline"
                onPress={handleLogout}
                className="w-full border-red-300 text-red-600"
              />
            </StyledView>
          </CardContent>
        </Card>
      </StyledScrollView>
    </StyledSafeAreaView>
  );
};