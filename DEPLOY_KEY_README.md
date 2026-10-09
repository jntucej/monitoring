# Deployment Key Configuration

To ensure the deployment process works correctly, especially for operations requiring write access (like synchronizing repository state or pushing status updates), the GitHub Deploy Key must be configured with write permissions.

## Steps to Enable Write Access

1.  **Locate your Public Key**:
    The public key file on your server is located at `/root/.ssh/myrepo_deploy.pub`.

2.  **Access GitHub Settings**:
    *   Navigate to your repository on GitHub.
    *   Go to **Settings** > **Deploy keys**.

3.  **Update or Add Key**:
    *   Find the existing key (matching the contents of your public key).
    *   If adding a new key, click **Add deploy key**.
    *   **Crucial Step**: Ensure the box **"Allow write access"** is **checked**.
    *   Click **Update key** or **Add key**.

Once this is done, your server will have the required permissions.
