---
title: "psycopgr Tutorial"
date: "2016-09-01T00:00:00"
summary: "For a Python guy who is not skilled at SQL and GIS, how to conveniently compute real optimal paths from locations to locations on real map efficiently, in Python?"
tags: ['GIS', 'pgRouting', 'PostGIS', 'blog']
categories: ["GIS"]
lastmod: 2019-05-04
comments: true
draft: false
---

## What is psycopgr

psycopgr [<i class="fa fa-github"></i>](https://github.com/herrkaefer/psycopgr) is a Python wrapper of [pgRouting](http://pgrouting.org/) written by me.

As said in [pgRouting docs](http://workshop.pgrouting.org/2.1.0-dev/en/chapters/wrapper.html):

>
>Just considering the different ways that the cost can be calculated, makes it almost impossible to create a general wrapper, that can work on all applications.

Indeed, in many applicatons you may need to modify the database tables and fill some computed values to fit your specific purpose, which is often done in a preprocessing stage by SQL, before real routing starts working. It is not appropriate to be wrapped.

However, after preprocessing things such as database creation, map data import, tables re-calculation and update, you are ready to use `psycopgr` to do another simple thing: **computing optimal routes from nodes to nodes on real map, in Python.**

Note that `psycopgr` is never a general purpose wrapper of pgRouting. I am a novice in GIS and what I want from this tool is just routes (with lowest costs) from places to places without writing a single line of SQL. 

For preprocessing stage, I have a post ["pgRouting notes"](/2016/08/30/pgrouting-notes/) for my own reference. Before enjoyable Python coding, you have to prepare a few stuffs.

## Tutorial

### Requirements

1. Prepare a PostgreSQL database, install PostGIS and pgRouting extensions, and import map data to database. ["pgRouting notes"](/2016/08/30/pgrouting-notes/) is a practical guide.

2. Update database tables according to your specific requirement. 

### Install psycopgr

```sh
pip install psycopgr
```
(Yes, it is on [PyPI](https://pypi.org/project/psycopgr/) now.)

Or, 

```sh
pipenv install psycopgr
```

As you may guessed from the name, `psycopgr` uses `psycopg2` as PostgreSQL driver. The above command will install it automatically.

### Steps

First, 

```python
from psycopgr import PgrNode, PGRouting
```

Create an PGRouting instance with database connection:

```python
pgr = PGRouting(database='mydb', user='user')
```

Adjust meta datas of tables including the edge table properies if they are different from the default (only the different properties needs to be set), e.g.:

```python
pgr.set_meta_data(cost='cost_s', reverse_cost='reverse_cost_s', directed=true)
```

This is the default meta datas:

```python
{
    'table': 'ways',
    'id': 'gid',
    'source': 'source',
    'target': 'target',
    'cost': 'cost_s', # driving time in second
    'reverse_cost': 'reverse_cost_s', # reverse driving time in second
    'x1': 'x1',
    'y1': 'y1',
    'x2': 'x2',
    'y2': 'y2',
    'geometry': 'the_geom',
    'has_reverse_cost': True,
    'directed': True,
    'srid': 4326
}
```

Prepare nodes. nodes are represented by `PgrNode` namedtuple with geographic coordinates rather than vertex id (vid) in the tables. `PgrNodes` is defined as:

```python
PgrNode = namedtuple('PgrNode', ['id', 'lon', 'lat'])
```

in which `id` could be `None` or self-defined value, and `lon` and `lat` are double precision values. Of course nodes could be input from various interfaces such as database or another program.

For example:

```python
nodes = [PgrNode(None, 116.30150, 40.05500),
         PgrNode(None, 116.36577, 40.00253),
         PgrNode(None, 116.30560, 39.95458),
         PgrNode(None, 116.46806, 39.99857)]
```

Now we can do routings:

```python
# many-to-many
routings = pgr.get_routes(nodes, nodes, end_speed=5.0, pgx_file='r.pgx')
# one-to-one
routings = pgr.get_routes(nodes[0], nodes[1])
# one-to-many
routings = pgr.get_routes(nodes[0], nodes)
# many-to-one
routings = pgr.get_routes(nodes, node[2])
```

- `end_speed`: speed from node to nearest vertices on ways in unit km/h.
- `gpx_file`: set it to output paths to a gpx file.

The returned is a dict of dict: `{(start_node, end_node): {'path': [PgrNode], 'cost': cost}`

By default, `cost` is traveling time along the path in unit second. It depends on the means of columns of the edge table that you set as `cost` and `reverse_cost`. You can assign the relations by `set_meta_data` function.

We can also get only costs without detailed paths returned:

```python
costs = pgr.get_costs(nodes, nodes)
```
The returned is also a dict: `{(start_node, end_node): cost}`


## Low-level wrapper of pgRouting functions

| psycopgr function | pgRouting function |
| :---------------- | :----------------- |
| dijkstra          | pgr_dijkstra       |
| dijkstra_cost     | pgr_dijkstraCost   |
| astar             | pgr_astar          |


These are direct wrappings of pgRouting functions. For example, `dijkstra` takes vertex ids as input. This list may be extended in the future.