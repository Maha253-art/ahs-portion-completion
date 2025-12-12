-- Allow users to insert their own profile (for Google OAuth)
CREATE POLICY "Users can insert their own profile"
ON users FOR INSERT
WITH CHECK (auth.uid() = id);
