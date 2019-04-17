const express = require("express");
const router = express.Router();
const mongoose = require('mongoose');
const passport = require('passport');

//LOad Post Model
const Post = require('../../models/Post')

//Load Profile Model
const Profile = require('../../models/Profile')

//Load validation
const validatePostInput = require('../../validation/post')
//@route    GET api/posts/test
//@desc     tests posts route
//@access    Public
router.get("/test", (req, res) => res.json({ msg: "Posts Works" }));

//@route    POST api/posts/
//@desc     create post route
//@access    Private
router.post('/', passport.authenticate('jwt', { session: false }), (req, res) => {
    const { errors, isValid } = validatePostInput(req.body);

    if (!isValid) {
        return res.status(400).json(errors);

    }

    const newPost = new Post({
        text: req.body.text,
        name: req.body.name,
        avatar: req.body.avatar,
        user: req.user.id
    });

    newPost.save()
        .then(post => res.json(post));
})

//@route    GET api/posts/
//@desc     get all posts route
//@access    Public
router.get('/', (req, res) => {
    Post.find()
        .sort({ date: -1 })
        .then(posts => {
            if (posts) {
                res.json(posts)
            } else {
                res.status(404).json({ nopostsfound: "No posts to display" })
            }

        })
        .catch(err => res.status(400).json(err))
})


//@route    GET api/posts/:post_id
//@desc     get single post route
//@access    Public
router.get('/:post_id', (req, res) => {
    Post.findById(req.params.post_id)
        .then(post => {
            if (post) {
                res.json(post)
            }

        })
        .catch(err => res.status(400).json({ nopostfound: "No posts to display" }))
})


//@route    DELETE api/posts/:post_id
//@desc     Delete post
//@access   Private
router.delete('/:post_id', passport.authenticate('jwt', { session: false }), (req, res) => {
    Profile.findOne({ user: req.user.id })
        .then(profile => {
            Post.findById(req.params.post_id)
                .then(post => {
                    //Check for post owner
                    if (post.user.toString() !== req.user.id) {
                        return res.status(401).json({ notauthorized: "User not authorized" })
                    } else {
                        //Delete post
                        post.remove()
                            .then(() => res.json({ success: true }))
                            .catch(err => res.status(404).json({ postnotfound: "No post found" }))
                    }
                })
                .catch(err => res.status(404).json(err))
        })
})

//@route    POST api/posts/like/:post_id
//@desc     Like post
//@access   Private
router.post('/like/:post_id', passport.authenticate('jwt', { session: false }), (req, res) => {
    Profile.findOne({ user: req.user.id })
        .then(profile => {
            Post.findById(req.params.post_id)
                .then(post => {

                    if (post.likes.filter(like => like.user.toString() === req.user.id).length > 0) {
                        return res.status(400).json({ alreadyliked: "User already liked this post" });
                    } else {
                        post.likes.unshift({ user: req.user.id });
                        post.save().then(post => res.json(post))
                    }
                })
                .catch(err => res.status(404).json(err))
        })
})


//@route    POST api/posts/unlike/:post_id
//@desc     Unlike post
//@access   Private
router.post('/unlike/:post_id', passport.authenticate('jwt', { session: false }), (req, res) => {
    Profile.findOne({ user: req.user.id })
        .then(profile => {
            Post.findById(req.params.post_id)
                .then(post => {

                    if (post.likes.filter(like => like.user.toString() === req.user.id).length === 0) {
                        return res.status(400).json({ notliked: "You have not yet liked this post" });
                    } else {
                        //Get remove index
                        const removeIndex = post.likes.map(item => item.user.toString())
                            .indexOf(req.user.id)

                        //Splice out of array
                        post.likes.splice(removeIndex, 1);

                        //save
                        post.save().then(post => res.json(post))
                    }
                })
                .catch(err => res.status(404).json(err))
        })
})



//@route    POST api/posts/comment/:post_id
//@desc     Comment to a post
//@access   Private
router.post('/comment/:post_id', passport.authenticate('jwt', { session: false }), (req, res) => {
    const { errors, isValid } = validatePostInput(req.body);

    if (!isValid) {
        return res.status(400).json(errors);

    }


    Post.findById(req.params.post_id)
        .then(post => {
            const newComment = {
                text: req.body.text,
                name: req.body.name,
                avatar: req.body.avatar,
                user: req.user.id
            }

            //Add to comments array
            post.comments.unshift(newComment);
            post.save().then(post => res.json(post));
        })
        .catch(err => res.status(404).json({ nopostfound: "No post found" }))
})


//@route    DELETE api/posts/comment/:post_id/:comment_id
//@desc     Delete comment from a post
//@access   Private
router.delete('/comment/:post_id/:comment_id', passport.authenticate('jwt', { session: false }), (req, res) => {
    Post.findById(req.params.post_id)
        .then(post => {
            //Check to see if comment exists

            if (post.comments.filter(comment => comment._id.toString() === req.params.comment_id).length === 0) {
                return res.status(404).json({ commentnotfound: "Comment not found" });
            } else {
                const removeIndex = post.comments
                    .map(item => item._id.toString())
                    .indexOf(req.params.comment_id);

                //splice comment out of array
                post.comments.splice(removeIndex, 1);
                post.save()
                    .then(post => res.json(post))
                    .catch(err => res.json(err))

            }
        })
        .catch(err => res.status(404).json({ nopostfound: "No post-comment found" }))
})

module.exports = router;
