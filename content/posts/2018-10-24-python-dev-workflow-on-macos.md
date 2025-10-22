---
title: "Python dev workflow on macOS"
date: "2018-10-24T00:00:00"
summary: "How to deal with project specific Python versions and packages?"
tags: ['']
categories: ["Python"]
draft: false
---

Here is the new workflow in place of the old popular one using `virtualenv`, `pip`, `requirements.txt` and `virtualenvwrapper`.



## Tools



- [**pyenv**](https://github.com/pyenv/pyenv) for Python version installation and switch



- [**Pipenv**](https://pipenv.readthedocs.io/en/latest/) for virtualenv creation and package management for each project



- [**Pipenv-Pipes**](https://github.com/gtalarico/pipenv-pipes) for Pipenv environment switch



Pipenv is the central tool. pyenv provides specific version of Python (and pip) for Pipenv to initialize its virtualenv. Pipes is just a handy tool for fast navigation between Pipenv's virtualenvs (like `virtualenvwrapper`'s `workon`), which may be built into Pipenv in the future.



## Basic workflow



### pyenv



To install:



```sh



$ brew install pyenv



```



then add `eval "$(pyenv init -)"` to shell (e.g. `~/.zshrc`)



To show available Python versions to install:



```sh



$ pyenv install --list



```



To install a Python version:



```sh



$ pyenv install



```



### Pipenv



Install Pipenv:



```sh



$ brew install pipenv



```



To install environment with specific Python version other than system default, this version must exist in system, so we can use pyenv to install the version first, then switch to its context.



```sh



$ pyenv shell



$ pipenv --python



```



After this, pyenv will be of no use because corresponding Python and pip have been installed into Pipenv's context, unless you update to a new Python version.



## Tips



### Create Pipfile from requirements.txt



To use Pipenv for an old project with `requirements.txt` available, we can first



```sh



$ pipenv install



```



`Pipfile` will be automatically created from `requirements.txt`, with all packages installed with specific version numbers.



Second, run



```sh



$ pipenv graph



```



to show a dependency tree graph, from which we can identify less packages that **we want**. Then we can manually edit `Pipfile` to keep only these key packages. Note that it does not need to make a Pipfile without any redundant (i.e. all packages are leaf nodes in the dependency tree).



Last, run `pipenv install` again.



### Time saving with `--skip-lock`



### Uninstall packages that are not in Pipfile



Manually deleted packages in Pipfile would not be automatically uninstalled, we can use



```sh



$ pipenv clean



```



### Sublime Text syntax highlighting of Pipfile



(Tested for ST 3)



1. Install package `TOML` for TOML syntax highlighting. (Pipfile uses TOML format.)



2. Install package `ApplySyntax` for custom syntax hightlighting for non-default format



3. Add the following to `ApplySyntax` settings:



```json



"syntaxes": [



{



"syntax": "TOML/TOML",



"rules": [



{"file_path": ".*\\Pipfile$"}



]



},



{



"syntax": "JavaScript/JSON",



"extensions": ["Pipfile.lock"]



},



]



```