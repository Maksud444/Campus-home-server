import express from 'express';
import Post from '../models/Post.model.js';

const router = express.Router();

// @desc    Get all posts
// @route   GET /api/posts
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { type } = req.query;
    
    const query = { status: 'active' };
    if (type && type !== 'all') {
      query.type = type;
    }

    const posts = await Post.find(query).sort({ createdAt: -1 });

    res.json({
      success: true,
      posts: posts.map(post => ({
        id: post._id.toString(),
        userId: post.userId,
        userName: post.userName,
        userEmail: post.userEmail,
        userImage: post.userImage,
        userRole: post.userRole,
        title: post.title,
        description: post.description,
        type: post.type,
        price: post.price,
        location: post.location,
        bedrooms: post.bedrooms,
        bathrooms: post.bathrooms,
        area: post.area,
        amenities: post.amenities,
        images: post.images,
        videos: post.videos,
        propertyType: post.propertyType,
        furnished: post.furnished,
        likes: post.likes,
        views: post.views,
        status: post.status,
        targetAudience: post.targetAudience,
        preferences: post.preferences,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt
      }))
    });
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get single post
// @route   GET /api/posts/:id
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post || post.status === 'deleted') {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Increment views
    post.views += 1;
    await post.save();

    res.json({
      success: true,
      post: {
        id: post._id.toString(),
        userId: post.userId,
        userName: post.userName,
        userEmail: post.userEmail,
        userImage: post.userImage,
        userRole: post.userRole,
        title: post.title,
        description: post.description,
        type: post.type,
        price: post.price,
        location: post.location,
        bedrooms: post.bedrooms,
        bathrooms: post.bathrooms,
        area: post.area,
        amenities: post.amenities,
        images: post.images,
        videos: post.videos,
        propertyType: post.propertyType,
        furnished: post.furnished,
        likes: post.likes,
        views: post.views,
        status: post.status,
        targetAudience: post.targetAudience,
        preferences: post.preferences,
        whatsappNumber: post.whatsappNumber,
        city: post.city,
        selectedArea: post.selectedArea,
        addressDetails: post.addressDetails,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt
      }
    });
  } catch (error) {
    console.error('Error fetching post:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Create post
// @route   POST /api/posts
// @access  Private (session required)
router.post('/', async (req, res) => {
  try {
    const {
      title,
      description,
      type,
      price,
      location,
      city,
      selectedArea,
      addressDetails,
      whatsappNumber,
      bedrooms,
      bathrooms,
      area,
      propertyType,
      furnished,
      amenities,
      images,
      videos,
      preferences,
      targetAudience,
      userName,
      userEmail,
      userId,
      userImage,
      userRole
    } = req.body;

    const newPost = new Post({
      userId,
      userName,
      userEmail,
      userImage,
      userRole,
      title,
      description,
      type,
      price,
      location,
      city,
      selectedArea,
      addressDetails,
      whatsappNumber,
      bedrooms,
      bathrooms,
      area,
      propertyType,
      furnished,
      amenities,
      images,
      videos,
      preferences,
      targetAudience
    });

    const savedPost = await newPost.save();

    res.status(201).json({
      success: true,
      message: 'Post created successfully',
      post: savedPost
    });
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create post',
      error: error.message
    });
  }
});

// @desc    Update post
// @route   PUT /api/posts/:id
// @access  Private
router.put('/:id', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    const updatedPost = await Post.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Post updated successfully',
      post: updatedPost
    });
  } catch (error) {
    console.error('Error updating post:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update post'
    });
  }
});

// @desc    Delete post
// @route   DELETE /api/posts/:id
// @access  Private
router.delete('/:id', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    post.status = 'deleted';
    await post.save();

    res.json({
      success: true,
      message: 'Post deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete post'
    });
  }
});

// @desc    Like/Unlike post
// @route   POST /api/posts/:id/like
// @access  Private
router.post('/:id/like', async (req, res) => {
  try {
    const { userId, userName } = req.body;
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    const likeIndex = post.likes.findIndex(like => like.userId === userId);

    if (likeIndex > -1) {
      // Unlike
      post.likes.splice(likeIndex, 1);
    } else {
      // Like
      post.likes.push({ userId, userName });
    }

    await post.save();

    res.json({
      success: true,
      post: {
        likes: post.likes
      }
    });
  } catch (error) {
    console.error('Error liking post:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to like post'
    });
  }
});

export default router;