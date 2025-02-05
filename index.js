const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const cors = require('cors');
const app = express();

app.use(cors({
    origin: 'http://localhost:3000', // Allow frontend to access
    credentials: true
}));

app.use(express.json());

mongoose.connect('mongodb+srv://rithigas2023cse:rithi2006@cluster0.nst8v.mongodb.net/Main_Blog?retryWrites=true&w=majority&appName=Cluster0', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Could not connect to MongoDB:', err));

// User Schema
const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
   
    portfolio: { type: String, default: '' },  // Portfolio link
});

const User = mongoose.model('User', UserSchema);

// Blog Schema
const BlogSchema = new mongoose.Schema({
    title: { type: String, required: true },
    content: { type: String, required: true },
    author: { type: String, required: true },
    category: { type: String, required: true },
    externalLink: { type: String, required: false },
    createdAt: { type: Date, default: Date.now },
    comments: [{ content: String, createdAt: { type: Date, default: Date.now } }] // Add comments field
});

const Blog = mongoose.model('Blog', BlogSchema);
// Register User Route
app.post('/register', async (req, res) => {
    const { username, password } = req.body; // Removed email

    // Validation check for fields
    if (!username || !password) { // Removed email validation
        return res.status(400).json({ message: 'Username and password are required' });
    }

    try {
        // Check if username already exists
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ message: 'Username already exists' });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create new user
        const newUser = new User({ username, password: hashedPassword });
        await newUser.save();

        res.status(200).json({ message: 'Registration successful' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Registration failed. Please try again.' });
    }
});


// Login User Route
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required' });
    }

    try {
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(400).json({ message: 'User not found' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({ message: 'Invalid password' });
        }

        res.status(200).json({ message: 'Login successful', username: user.username });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Login failed. Please try again later.' });
    }
});

// Get Profile Route
app.get('/profile', async (req, res) => {
    const { username } = req.query;

    try {
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(400).json({ message: 'User not found' });
        }

        // Fetch blogs count
        const blogsCount = await Blog.countDocuments({ author: username });

        res.status(200).json({
            username: user.username,
            email: user.email,
            portfolio: user.portfolio,
            blogsCount,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error fetching profile' });
    }
});

app.put('/profile', async (req, res) => {
    console.log("Received update request:", req.body); // Debugging log

    const { username, portfolio } = req.body;

    try {
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(400).json({ message: 'User not found' });
        }

        user.portfolio = portfolio;
        await user.save();

        res.status(200).json({ message: 'Profile updated successfully', user });
    } catch (err) {
        console.error('Error updating profile:', err);
        res.status(500).json({ message: 'Failed to update profile' });
    }
});

// Create Blog Route
app.post('/blogs/create', async (req, res) => {
    const { title, content, author, category, externalLink } = req.body;

    if (!title || !content || !author || !category) {
        return res.status(400).json({ message: 'Please fill all the required fields' });
    }

    try {
        const newBlog = new Blog({
            title,
            content,
            author,
            category,
            externalLink,
        });

        await newBlog.save();
        res.status(200).json({ message: 'Blog created successfully', blog: newBlog });
    } catch (error) {
        console.error('Error creating blog:', error);
        res.status(500).json({ message: 'Error creating blog, please try again' });
    }
});

// Get All Blogs
app.get('/blogs', async (req, res) => {
    try {
        const blogs = await Blog.find();
        res.status(200).json({ blogs });
    } catch (error) {
        console.error('Error fetching blogs:', error);
        res.status(500).json({ message: 'Error fetching blogs' });
    }
});

// Update Blog
app.put('/update-blog/:id', async (req, res) => {
    const { id } = req.params;
    const { blogName, theme, information, url } = req.body;

    try {
        const updatedBlog = await Blog.findByIdAndUpdate(
            id,
            { blogName, theme, information, url },
            { new: true }
        );

        if (!updatedBlog) {
            return res.status(404).json({ message: 'Blog not found' });
        }

        res.status(200).json({ message: 'Blog updated successfully', blog: updatedBlog });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to update blog' });
    }
});

// Delete Blog
app.delete('/delete-blog/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const deletedBlog = await Blog.findByIdAndDelete(id);

        if (!deletedBlog) {
            return res.status(404).json({ message: 'Blog not found' });
        }

        res.status(200).json({ message: 'Blog deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to delete blog' });
    }
});

app.post('/blogs/comment/:id', async (req, res) => {
    const { id } = req.params;
    const { content } = req.body;

    if (!content) {
        return res.status(400).json({ message: 'Content is required for the comment' });
    }

    try {
        const blog = await Blog.findById(id);

        if (!blog) {
            return res.status(404).json({ message: 'Blog not found' });
        }

        blog.comments = blog.comments || []; // Ensure the comments array exists
        blog.comments.push({ content });

        await blog.save();

        return res.status(200).json({
            message: 'Comment added successfully',
            blog: blog // Send the updated blog with the new comment
        });
    } catch (err) {
        console.error('Error adding comment:', err);
        res.status(500).json({ message: 'Error adding comment' });
    }
});

// Start server
app.listen(4000, () => {
    console.log('Server is running on http://localhost:4000');
});
